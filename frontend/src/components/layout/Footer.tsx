import { Link } from 'react-router-dom';
import logoSrc from '@/assets/auctionhub-logo.svg';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E2B5BE] bg-white py-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 text-sm text-slate-600 md:grid-cols-[1.4fr,1fr,1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <img src={logoSrc} alt="AuctionHub Luxury" className="h-7 w-7 rounded-md" />
            <span className="text-base font-bold text-[#7A1F2B]">AuctionHub Luxury</span>
          </div>
          <p className="leading-6">
            Nền tảng đấu giá trực tuyến cho sản phẩm giá trị cao, minh bạch dữ liệu theo chuẩn thời
            gian server.
          </p>
          <p className="mt-2">Liên hệ: support@auctionhub.vn | 1900 6868</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7A1F2B]">
            Chính sách
          </p>
          <div className="space-y-2">
            <Link to="/about" className="block hover:text-[#7A1F2B]">
              Điều khoản bảo mật
            </Link>
            <Link to="/about" className="block hover:text-[#7A1F2B]">
              Chính sách giải quyết tranh chấp
            </Link>
            <Link to="/about" className="block hover:text-[#7A1F2B]">
              Quy định vận hành phiên đấu giá
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7A1F2B]">
            Điều hướng nhanh
          </p>
          <div className="space-y-2">
            <Link to="/" className="block hover:text-[#7A1F2B]">
              Trang chủ
            </Link>
            <Link to="/explore" className="block hover:text-[#7A1F2B]">
              Khám phá phiên
            </Link>
            <Link to="/news" className="block hover:text-[#7A1F2B]">
              Tin tức đấu giá
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
