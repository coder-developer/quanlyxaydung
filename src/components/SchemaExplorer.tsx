/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { dbTables, dbRelationships, generatePostgreSqlDdl, DbTable } from '../data/dbSchema';
import { Database, Key, Link as LinkIcon, Search, Copy, Check, Info, FileText, Share2, Layers } from 'lucide-react';

export default function SchemaExplorer() {
  const [selectedTable, setSelectedTable] = useState<string>('projects');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'columns' | 'erd' | 'sql'>('columns');
  const [copied, setCopied] = useState<boolean>(false);

  const filteredTables = dbTables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTable = dbTables.find(t => t.name === selectedTable) || dbTables[0];

  const handleCopySql = () => {
    const ddl = generatePostgreSqlDdl();
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get foreign relationships for current table
  const currentTableRelations = dbRelationships.filter(
    r => r.fromTable === selectedTable || r.toTable === selectedTable
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full" id="schema-explorer-root">
      {/* Table List Sidebar */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-xs border border-gray-100 p-4 flex flex-col h-[700px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Cơ Sở Dữ Liệu (11 Bảng)
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm bảng hoặc mô tả..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredTables.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 flex flex-col gap-1 ${
                selectedTable === table.name
                  ? 'bg-emerald-50 text-emerald-950 border-l-4 border-emerald-600 font-medium shadow-2xs'
                  : 'hover:bg-gray-50 text-gray-700 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">{table.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-sm text-gray-500">
                  {table.columns.length} cols
                </span>
              </div>
              <p className="text-[10px] text-gray-500 line-clamp-1">{table.description}</p>
            </button>
          ))}
          {filteredTables.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">Không tìm thấy bảng phù hợp</div>
          )}
        </div>
      </div>

      {/* Main Schema Workspace */}
      <div className="lg:col-span-3 bg-white rounded-xl shadow-xs border border-gray-100 p-6 flex flex-col h-[700px]">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 font-mono">
                {currentTable.name}
              </h2>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                Schema Table
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{currentTable.description}</p>
          </div>

          {/* Action Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto text-xs">
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                activeTab === 'columns' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cấu trúc Cột (Columns)
            </button>
            <button
              onClick={() => setActiveTab('erd')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                activeTab === 'erd' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Liên kết ERD
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                activeTab === 'sql' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Xem Code SQL
            </button>
          </div>
        </div>

        {/* Tab Content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'columns' && (
            <div className="space-y-6">
              {/* Columns Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Cột (Field)</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Kiểu Dữ Liệu (Type)</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Ràng buộc (Constraints)</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Mô tả nghiệp vụ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-150">
                    {currentTable.columns.map((column, idx) => {
                      const isPk = currentTable.primaryKeys.includes(column.name);
                      const isFk = column.constraints.some(c => c.includes('REFERENCES'));
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-gray-900 flex items-center gap-1.5">
                            {isPk && <Key className="w-3.5 h-3.5 text-amber-500" title="Primary Key" />}
                            {isFk && <LinkIcon className="w-3.5 h-3.5 text-emerald-500" title="Foreign Key" />}
                            <span>{column.name}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-emerald-800 font-semibold">{column.type}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {column.constraints.map((c, cIdx) => (
                                <span key={cIdx} className="px-1.5 py-0.5 text-[9px] font-mono bg-amber-50 text-amber-800 rounded border border-amber-200">
                                  {c}
                                </span>
                              ))}
                              {column.constraints.length === 0 && <span className="text-gray-400 font-mono">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs md:max-w-md">{column.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Indexes Section */}
              {currentTable.indexes.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Chỉ mục & Performance Indexes
                  </h4>
                  <div className="space-y-1.5">
                    {currentTable.indexes.map((idx, iIdx) => (
                      <div key={iIdx} className="font-mono text-xs bg-white py-1 px-3.5 rounded border border-gray-200 text-gray-700 shadow-3xs">
                        {idx}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'erd' && (
            <div className="space-y-6">
              {/* ERD Connections Visual Summary */}
              <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/60 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950">
                  <span className="font-semibold">Mối quan hệ cơ sở dữ liệu:</span> Bảng này tham chiếu hoặc được tham chiếu bởi các bảng khác thông qua khóa ngoại (FK) như dưới đây. Điều này đảm bảo tính toàn vẹn dữ liệu (Referential Integrity) ở mức database cốt lõi.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentTableRelations.map((rel, idx) => {
                  const isIncoming = rel.toTable === selectedTable;
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border transition-all ${
                        isIncoming 
                          ? 'bg-amber-50/30 border-amber-100' 
                          : 'bg-indigo-50/30 border-indigo-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isIncoming ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isIncoming ? 'Tham chiếu đến bảng này (Incoming)' : 'Bảng này tham chiếu đi (Outgoing)'}
                        </span>
                        <span className="font-mono text-xs font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded shadow-3xs">
                          {rel.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-center py-3 bg-white rounded-lg border border-gray-100 my-3 font-mono text-xs shadow-3xs">
                        <span className={`font-semibold ${rel.fromTable === selectedTable ? 'text-emerald-700 font-bold' : 'text-gray-700'}`}>
                          {rel.fromTable}.{rel.fromColumn}
                        </span>
                        <span className="text-gray-400 font-semibold font-sans">➔</span>
                        <span className={`font-semibold ${rel.toTable === selectedTable ? 'text-emerald-700 font-bold' : 'text-gray-700'}`}>
                          {rel.toTable}.{rel.toColumn}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {rel.description}
                      </p>
                    </div>
                  );
                })}
                {currentTableRelations.length === 0 && (
                  <div className="col-span-2 text-center py-10 bg-gray-50 rounded-xl text-gray-500 text-xs">
                    Không có mối quan hệ trực tiếp nào được khai báo cho bảng này.
                  </div>
                )}
              </div>

              {/* Specific requirements check: Labor-Project and Materials-Project */}
              {selectedTable === 'projects' && (
                <div className="mt-4 p-4 bg-sky-50 rounded-xl border border-sky-100 space-y-3">
                  <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-sky-700" />
                    Mối quan hệ Đặc thù Xây dựng được tối ưu hóa:
                  </h4>
                  <ul className="text-xs text-sky-900 space-y-2 list-disc pl-4 leading-relaxed">
                    <li>
                      <strong>Mối quan hệ Nhân sự - Dự án (1-Nhiều)</strong>: Được kết nối qua cột khóa ngoại <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">employees.project_id</code> để xác định chính xác công nhân, kỹ sư nào đang trực thuộc công trường nào trong 5 dự án. Cột này có thiết lập Index để tối ưu truy vấn chấm công GPS đa điểm.
                    </li>
                    <li>
                      <strong>Mối quan hệ Định mức Vật tư - Dự án (Nhiều-Nhiều)</strong>: Được mô hình hóa thông qua bảng trung gian <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">material_limits</code> chứa khóa ngoại kép <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">project_id</code> và <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">item_id</code>. Bảng này lưu trữ trực tiếp <code className="font-semibold">planned_qty</code> (định mức dự toán tối đa) và <code className="font-semibold">actual_issued_qty</code> (thực xuất lũy kế) để kích hoạt hệ thống cảnh báo đỏ tự động (Anomaly Warning Trigger) khi xuất kho vượt định mức.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between bg-gray-950 text-gray-400 px-4 py-2 rounded-t-xl text-xs border-b border-gray-800">
                <span className="font-mono">postgresql_cloud_sql_schema.sql</span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1 hover:text-white transition-colors duration-150 py-1 px-2 hover:bg-gray-800 rounded font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Sao chép Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 p-4 bg-gray-900 rounded-b-xl overflow-auto text-[11px] font-mono text-gray-300 leading-relaxed max-h-[480px]">
                {generatePostgreSqlDdl()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
