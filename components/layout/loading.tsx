export default function Loading({text}: {text?: string}) {
    return <div className="flex flex-col items-center justify-center h-full container mx-auto px-4 pt-8 relative">
        <div className="loader">
        <div className="loader-outter"></div>
        <div className="loader-inner"></div>
        </div>
        {text && <div className="text-2xl font-bold mt-2">{text}</div>}
    </div>
}