import CertificateList from "@/components/certificates/CertificateList";

export default function CertificatesPage() {
    return (
        <div className="container mx-auto min-h-screen py-4 px-4">
            <h1 className="text-2xl font-bold mb-4">Сертификаты</h1>
            <CertificateList />
        </div>
    );
}