import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useLoadScript, Marker, Polygon, InfoWindow } from "@react-google-maps/api";
import { Transaction, useGetTransactions } from "../common/hooks/useGetTransactions.hook";
import { ErrorBanner } from "../common/components/ErrorBanner";
import { LoadingSpinner } from "../common/components/LoadingSpinner";
import { center, MAP_API_KEY, Saritoken, mapContainerStyle, mapOptions } from "../common/utlis/constants";

interface Poi {
  label: string;
  lat: number;
  lng: number;
}

export const LiveMap = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [polygons, setPolygons] = useState<any[] | null>(null);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds>();
  const [currZoom, setCurrentZoom] = useState(10);
  const [enableFetchTransacions, setEnableFetchTransacions] = useState(true);
  const [enableShowTransactions, setEnableShowTransacions] = useState(true);
  const { transactions, isLoading, error } = useGetTransactions(mapBounds, currZoom, enableFetchTransacions);
  const [errorMessage, setErrorMEssage] = useState<string | null>(null);
  const [avgPrices, setAvgPrices] = useState<number>();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [pios, setPios] = useState<Poi[]>([]);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapType, setMapType] = useState('roadmap');
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: MAP_API_KEY,
  });

  const handleZoomChanged = () => {
    const currentZoom = mapRef.current?.getZoom();
    if (currentZoom !== undefined) {
      setCurrentZoom(currentZoom);
    };
  }

  const parsePolygonData = (polygonData: Transaction[]) => {
    const parsedData = polygonData.map(data => JSON.parse(data.polygonData));
    const coordinates = parsedData[0].coordinates[0];
    const polygonsCoordinates = coordinates.map(([lat, lng]: any) => ({ lat, lng }));
    setPolygons(polygonsCoordinates)
  };

  useEffect(() => {
    const handleTransactionsData = (transactionsData: Transaction[]) => {
      window.parent.postMessage({
        type: 'TRANSACTIONS_DATA',
        data: transactions,
      }, 'http://localhost:3001');
    };
    if (transactions && transactions.length > 0) {
      const transactionsPrices = transactions.map(transaction => transaction.priceOfMeter);
      const sum = transactionsPrices.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      setAvgPrices(sum / transactions.length)
      parsePolygonData(transactions)
      handleTransactionsData(transactions)
    }
  }, [transactions])

  
  const handleBoundsChanged = () => {
    const bounds = mapRef.current?.getBounds();
    if (bounds) {
      setMapBounds(bounds);
    }
  };

  const handleMessage = (event: MessageEvent) => {
    const { type, token } = event.data;
    if (event.origin === 'http://localhost:3001') {
      //The token must be checked in BE, and should have SSL certificate in the cloud so we can return all the bundle.
      if (type === "TOKEN" && token === Saritoken) {
        setIsAuth(true)
      }
      else if (type === 'Updated_ZOOM') {
        setCurrentZoom(event.data.updatedZoom);
        if (mapRef.current) {
          mapRef.current.setZoom(event.data.updatedZoom);
        }
      } else if (type === 'NEW_PIOS') {
        const newPois = {
          label: event.data.name,
          lat: parseFloat(event.data.lat),
          lng: parseFloat(event.data.lng)
        };
        setPios((prev) => [...prev, newPois])
      } else if (type === "CENTER") {
        const newCenter = {
          lat: parseFloat(event.data.centerX),
          lng: parseFloat(event.data.centerY)
        }
        setMapCenter(newCenter);
        if (mapRef.current) {
          mapRef.current.setCenter(newCenter);
        }
      } else if (type === "MAP_TYPE") {
        setMapType(event.data.mapType);
        if (mapRef.current) {
          mapRef.current.setMapTypeId(event.data.mapType.toLocaleLowerCase());
        }
      } else if (type === "ENABLE_FETCH") {
        setEnableFetchTransacions(event.data.enableFetch);
      } else if (type === "ENABLE_SHOW") {
        setEnableShowTransacions(event.data.enableShow);
      }

    }
  };

  const handleMapClick = async (event: any) => {
    const { latLng } = event;
    const latitude = latLng.lat();
    const longitude = latLng.lng();
    const apiKey = 'AIzaSyBwhe7wmRgpL19gxofhGzn3LD4_OZDgTGw';
    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      const addressDetails = data.results[0]?.formatted_address;
      window.parent.postMessage({
        type: 'SELECTED_ADDRESS',
        details: addressDetails,
      }, 'http://localhost:3001');

    } catch (error) {
      setErrorMEssage("Error in geting address details");
    }
  }

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);


  if (loadError) {
    return <ErrorBanner message="Map loading error, try again" />
  }
  if (error) {
    return <ErrorBanner message="Error fetching data, try again" />
  }

  if (!isLoaded || isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuth) {
    return <ErrorBanner message="Not authenticated, need token" />
  }

  return (
    <div className="viewsContainer">
      <div className="map">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={currZoom}
          center={mapCenter}
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map;
            map.addListener("zoom_changed", handleZoomChanged);
            map.addListener('bounds_changed', handleBoundsChanged);
            map.setMapTypeId(mapType);
          }}
          options={mapOptions}
        >
          <Marker position={center} />
          {pios?.map((points, index) => (
            <Marker
              key={index}
              label={points.label}
              position={{ lat: points.lat, lng: points.lng }}
            />
          ))}

          {enableShowTransactions && transactions && polygons && (
            transactions.map((transaction, index) => {
              return (<React.Fragment key={index}>
                <Polygon
                  paths={polygons}
                  options={{
                    fillColor: '#00FF00',
                    fillOpacity: 0.35,
                    strokeColor: '#0000FF',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
                <InfoWindow
                  position={{
                    lat: transaction.centroid.x,
                    lng: transaction.centroid.y
                  } as any}

                >
                  <div >
                    <div>Type: ${transaction.type}</div>
                  </div>
                </InfoWindow>
              </React.Fragment>
              )
            })
          )}

        </GoogleMap>
      </div>
      <div className="currZoom">
        <p> Current Zoom: {currZoom}</p>
        {avgPrices && <p>Avg Price: {avgPrices.toFixed(2)}$</p>}
        {errorMessage && <ErrorBanner message="Transaction Details is not fetched correctly" />}
      </div>
    </div>
  );
}
