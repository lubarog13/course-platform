export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto">
        <p className="text-center">Copyright © {new Date().getFullYear()} Онлайн-курсы</p>
      </div>
    </footer>
  );
}