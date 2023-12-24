import { useEffect, useState } from "react";
import { API_URL } from "../utlis/constants";

interface Response {
    data: Transaction[];
    message: string;
    status: boolean;
    meta: null;
}

export interface Transaction {
    transactionNumber: number;
    transactionPrice: number;
    transactionDate: string;
    type: string;
    subdivisionNo: string;
    subdivisionId: string;
    polygonData: any;
    priceOfMeter: number;
    noOfProperties: number;
    zoningId: string;
    neighborhood: string;
    neighborhoodId: number;
    region: string;
    parcelId: string;
    parcelObjectId: string;
    parcelNo: string;
    blockNo: string;
    area: number;
    centroidX: number;
    centroidY: number;
    metricsType: string;
    provinceId: number;
    provinceName: string;
    regionId: number;
    geometry: string;
    parcelImageURL: string;
    projectName: string;
    landUsageGroup: string;
    sellingType: string;
    landUseaDetailed: string;
    centroid: {
        x: number;
        y: number;
    };
    propertyType: string;
    totalArea: number;
    details: string;
    landUseGroup: string;
    orignalTransactionNum: number;
    propertyNumber: string;
}

export const useGetTransactions = (bounds?: google.maps.LatLngBounds, currZoom?: number, isFetchEnabled?: boolean) => {
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>();

    useEffect(() => {
        const getTransactions = async () => {
            if (currZoom && currZoom >= 14 && isFetchEnabled) {
                try {
                    setIsLoading(true)
                    const boundaryFrom = `${bounds?.getSouthWest().lng()},${bounds?.getSouthWest().lat()}`;
                    const boundaryTo = `${bounds?.getNorthEast().lng()},${bounds?.getNorthEast().lat()}`;
                    const response = await fetch(`${API_URL}?boundaryFrom=${boundaryFrom}&boundaryTo=${boundaryTo}&period=one_year,six_months`,
                        {
                            method: "GET",
                        }
                    );
                    const data = await response.json() as Response;
                    setTransactions(data.data)
                }
                catch(err) {
                    setError("Error in fetching, try agian!")
                }
                finally {
                    setIsLoading(false)
                }
            } 
        };
        getTransactions();
    }, [bounds, currZoom, isFetchEnabled]);

    return { transactions, isLoading, error }
};
