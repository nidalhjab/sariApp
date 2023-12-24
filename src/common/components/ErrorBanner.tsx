interface ErrorMessage {
    message: string
}
export const ErrorBanner = ({ message }: ErrorMessage) => {
    return (
        <div className='error'>
            <p>{message}</p>
        </div>
    )
}
