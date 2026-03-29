import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Search } from 'lucide-react';
import { auctionService } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTimeVN } from '@/utils/dateTime';

const LOG_LEVELS: Array<'DEBUG' | 'INFO' | 'WARN' | 'ERROR'> = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

function formatDate(value: string): string {
  return formatDateTimeVN(value);
}

export default function AdminHistoryDataPage() {
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | ''>('');

  const {
    data: logsData,
    isLoading: loadingLogs,
    isFetching: fetchingLogs,
  } = useQuery({
    queryKey: ['admin-system-logs', logSearch, logLevel],
    queryFn: () =>
      auctionService.getAdminSystemLogs({
        page: 1,
        limit: 100,
        search: logSearch.trim() || undefined,
        level: (logLevel || undefined) as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | undefined,
      }),
    refetchInterval: 10_000,
  });

  if (loadingLogs) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải log hệ thống..." />
      </div>
    );
  }

  const logs = logsData?.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-2">
          <Database className="mt-1 h-4 w-4 text-[#7A1F2B]" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Cài đặt và Log hệ thống</h1>
            <p className="mt-1 text-sm text-slate-600">
              Khu vực lưu trữ log lỗi server và lịch sử thao tác để phục vụ đối soát/backup.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-slate-900">Log hệ thống</h2>
          <div className="relative ml-auto min-w-[18rem] flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Tìm theo message hoặc source..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
          </div>
          <select
            value={logLevel}
            onChange={(e) =>
              setLogLevel(e.target.value as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | '')
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          >
            <option value="">Tất cả level</option>
            {LOG_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {fetchingLogs && <p className="mb-2 text-xs text-slate-500">Đang làm mới logs...</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Thời gian</th>
                <th className="px-3 py-2 text-left font-semibold">Level</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
                <th className="px-3 py-2 text-left font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Không có log phù hợp.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          log.level === 'ERROR'
                            ? 'bg-rose-100 text-rose-700'
                            : log.level === 'WARN'
                              ? 'bg-amber-100 text-amber-700'
                              : log.level === 'INFO'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{log.source}</td>
                    <td className="px-3 py-2 text-slate-700">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
