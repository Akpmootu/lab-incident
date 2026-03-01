import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function Dashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [filterMonth, setFilterMonth] = useState(
    (new Date().getMonth() + 1).toString().padStart(2, "0"),
  );
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("incident_date", { ascending: true });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing ---
  // Filter by year (and month if monthly view)
  const filteredData = incidents.filter((inc) => {
    if (viewMode === "monthly") {
      return inc.incident_date.startsWith(`${filterYear}-${filterMonth}`);
    } else {
      // Yearly view: Fiscal year (Oct - Sep)
      // If filterYear is 2024, fiscal year is Oct 2023 - Sep 2024
      const date = new Date(inc.incident_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const targetYear = parseInt(filterYear);
      return (
        (year === targetYear - 1 && month >= 10) ||
        (year === targetYear && month <= 9)
      );
    }
  });

  // Summary Cards Data
  const summary = {
    total: filteredData.length,
    preAnalytical: filteredData.filter(
      (i) => i.process_type === "Pre-analytical",
    ).length,
    analytical: filteredData.filter((i) => i.process_type === "Analytical")
      .length,
    postAnalytical: filteredData.filter(
      (i) => i.process_type === "Post-analytical",
    ).length,
    nonClinic: filteredData.filter((i) => i.risk_type === "Non-clinic").length,
    miss: filteredData.filter((i) => i.group_type === "Miss").length,
    nearMiss: filteredData.filter((i) => i.group_type === "Near Miss").length,
  };

  // Group by Risk Items
  const riskItemsMap = new Map<string, any[]>();
  filteredData.forEach((inc) => {
    inc.risk_items.forEach((item: string) => {
      if (!riskItemsMap.has(item)) riskItemsMap.set(item, []);
      riskItemsMap.get(item)!.push(inc);
    });
    if (inc.other_risk_item) {
      const item = inc.other_risk_item;
      if (!riskItemsMap.has(item)) riskItemsMap.set(item, []);
      riskItemsMap.get(item)!.push(inc);
    }
  });

  const uniqueRiskItems = Array.from(riskItemsMap.keys());

  // Generate Columns based on View Mode
  let columns: { key: string; label: string }[] = [];
  if (viewMode === "monthly") {
    const daysInMonth = new Date(
      parseInt(filterYear),
      parseInt(filterMonth),
      0,
    ).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      columns.push({ key: i.toString().padStart(2, "0"), label: i.toString() });
    }
  } else {
    columns = [
      { key: "10", label: "ต.ค." },
      { key: "11", label: "พ.ย." },
      { key: "12", label: "ธ.ค." },
      { key: "01", label: "ม.ค." },
      { key: "02", label: "ก.พ." },
      { key: "03", label: "มี.ค." },
      { key: "04", label: "เม.ย." },
      { key: "05", label: "พ.ค." },
      { key: "06", label: "มิ.ย." },
      { key: "07", label: "ก.ค." },
      { key: "08", label: "ส.ค." },
      { key: "09", label: "ก.ย." },
    ];
  }

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("สรุปอุบัติการณ์");

      // Header
      const header = [
        "ลำดับ",
        "ความเสี่ยง",
        ...columns.map((c) => c.label),
        "รวม",
        "กราฟแนวโน้ม",
        "การแก้ไข",
        "แนวทางปฏิบัติ",
        "หมายเหตุ",
      ];
      worksheet.addRow(header);

      // Rows
      for (let index = 0; index < uniqueRiskItems.length; index++) {
        const item = uniqueRiskItems[index];
        const itemIncidents = riskItemsMap.get(item) || [];
        const rowData: any[] = [index + 1, item];

        let total = 0;
        columns.forEach((col) => {
          let count = 0;
          if (viewMode === "monthly") {
            count = itemIncidents.filter((inc) =>
              inc.incident_date.endsWith(`-${col.key}`),
            ).length;
          } else {
            count = itemIncidents.filter(
              (inc) => inc.incident_date.split("-")[1] === col.key,
            ).length;
          }
          rowData.push(count);
          total += count;
        });

        rowData.push(total);
        rowData.push(""); // Placeholder for chart

        // Get the most recent initial_response and guideline for this item
        const latestInc = itemIncidents.sort(
          (a, b) =>
            new Date(b.incident_date).getTime() -
            new Date(a.incident_date).getTime(),
        )[0];
        rowData.push(latestInc?.initial_response || "");
        rowData.push(latestInc?.guideline || "");
        rowData.push(""); // Note

        const row = worksheet.addRow(rowData);
        row.height = 60; // Make row taller for the chart

        // Capture chart image
        const chartElement = document.getElementById(`trend-chart-${index}`);
        if (chartElement) {
          const canvas = await html2canvas(chartElement, { scale: 2 });
          const base64Image = canvas.toDataURL("image/png");

          const imageId = workbook.addImage({
            base64: base64Image,
            extension: "png",
          });

          // Add image to the specific cell
          // tl: { col: columns.length + 3, row: index + 1 }
          // col 0 = ลำดับ, 1 = ความเสี่ยง, 2 to 2+cols-1 = days, 2+cols = รวม, 3+cols = กราฟ
          worksheet.addImage(imageId, {
            tl: { col: columns.length + 3, row: index + 1 },
            ext: { width: 150, height: 70 },
          });
        }
      }

      // Formatting
      worksheet.getColumn(2).width = 30; // ความเสี่ยง
      worksheet.getColumn(columns.length + 4).width = 25; // กราฟแนวโน้ม
      worksheet.getColumn(columns.length + 5).width = 30; // การแก้ไข
      worksheet.getColumn(columns.length + 6).width = 30; // แนวทางปฏิบัติ

      // Header styling
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: "center" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `สรุปอุบัติการณ์_${viewMode === "monthly" ? filterMonth + "_" : ""}${Number(filterYear) + 543}.xlsx`,
      );
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถ Export ไฟล์ Excel ได้", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const saveAsImage = async () => {
    if (!tableRef.current) return;
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.download = `สรุปอุบัติการณ์_${viewMode === "monthly" ? filterMonth + "_" : ""}${Number(filterYear) + 543}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error saving image:", err);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถบันทึกรูปภาพได้", "error");
    }
  };

  const renderTrendChart = (itemIncidents: any[], index: number) => {
    const data = columns.map((col) => {
      let count = 0;
      if (viewMode === "monthly") {
        count = itemIncidents.filter((inc) =>
          inc.incident_date.endsWith(`-${col.key}`),
        ).length;
      } else {
        count = itemIncidents.filter(
          (inc) => inc.incident_date.split("-")[1] === col.key,
        ).length;
      }
      return { name: col.label, value: count };
    });

    return (
      <div id={`trend-chart-${index}`} className="h-20 w-40 mx-auto bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 2, fill: "#f97316" }}
              isAnimationActive={false}
            />
            <XAxis dataKey="name" hide />
            <YAxis hide domain={[0, "dataMax + 1"]} />
            <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 4px" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-500 flex flex-col items-center gap-3">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
          <p className="font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <i className="fa-solid fa-chart-pie text-blue-600"></i>
            สรุปรายงานอุบัติการณ์
          </h1>
          <p className="text-slate-500 mt-1">
            ข้อมูลสถิติและกราฟแสดงแนวโน้มความเสี่ยง
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value as "monthly" | "yearly")
            }
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
          >
            <option value="monthly">รายเดือน</option>
            <option value="yearly">รายปี (ปีงบประมาณ)</option>
          </select>

          {viewMode === "monthly" && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
            >
              {[
                { val: "01", label: "มกราคม" },
                { val: "02", label: "กุมภาพันธ์" },
                { val: "03", label: "มีนาคม" },
                { val: "04", label: "เมษายน" },
                { val: "05", label: "พฤษภาคม" },
                { val: "06", label: "มิถุนายน" },
                { val: "07", label: "กรกฎาคม" },
                { val: "08", label: "สิงหาคม" },
                { val: "09", label: "กันยายน" },
                { val: "10", label: "ตุลาคม" },
                { val: "11", label: "พฤศจิกายน" },
                { val: "12", label: "ธันวาคม" },
              ].map((m) => (
                <option key={m.val} value={m.val}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                ปี พ.ศ. {year + 543}
              </option>
            ))}
          </select>

          <button
            onClick={saveAsImage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-image"></i>
            บันทึกรูปภาพ
          </button>
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {isExporting ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-file-excel"></i>
            )}
            {isExporting ? "กำลัง Export..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium mb-1">รวมทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-100 text-center">
          <p className="text-xs text-blue-600 font-medium mb-1">
            Pre-analytical
          </p>
          <p className="text-2xl font-bold text-blue-800">
            {summary.preAnalytical}
          </p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-2xl shadow-sm border border-indigo-100 text-center">
          <p className="text-xs text-indigo-600 font-medium mb-1">Analytical</p>
          <p className="text-2xl font-bold text-indigo-800">
            {summary.analytical}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl shadow-sm border border-purple-100 text-center">
          <p className="text-xs text-purple-600 font-medium mb-1">
            Post-analytical
          </p>
          <p className="text-2xl font-bold text-purple-800">
            {summary.postAnalytical}
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium mb-1">อื่นๆ</p>
          <p className="text-2xl font-bold text-slate-800">
            {summary.nonClinic}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100 text-center">
          <p className="text-xs text-red-600 font-medium mb-1">Miss</p>
          <p className="text-2xl font-bold text-red-800">{summary.miss}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl shadow-sm border border-orange-100 text-center">
          <p className="text-xs text-orange-600 font-medium mb-1">Near Miss</p>
          <p className="text-2xl font-bold text-orange-800">
            {summary.nearMiss}
          </p>
        </div>
      </div>

      {/* Detailed Table with Trend Graphs */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        ref={tableRef}
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-slate-800">
          สรุปการรายงานอุบัติการณ์{" "}
          {viewMode === "monthly"
            ? `ประจำเดือน ${filterMonth}/${Number(filterYear) + 543}`
            : `ปีงบประมาณ ${Number(filterYear) + 543}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="border border-slate-200 px-2 py-3 text-center w-12">
                  ลำดับ
                </th>
                <th className="border border-slate-200 px-4 py-3 min-w-[200px]">
                  ความเสี่ยง
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border border-slate-200 px-1 py-3 text-center min-w-[30px]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="border border-slate-200 px-2 py-3 text-center">
                  รวม
                </th>
                <th className="border border-slate-200 px-4 py-3 text-center min-w-[150px]">
                  กราฟแนวโน้ม
                </th>
                <th className="border border-slate-200 px-4 py-3 min-w-[200px]">
                  การแก้ไข
                </th>
                <th className="border border-slate-200 px-4 py-3 min-w-[200px]">
                  แนวทางปฏิบัติ
                </th>
                <th className="border border-slate-200 px-4 py-3 min-w-[100px]">
                  หมายเหตุ
                </th>
              </tr>
            </thead>
            <tbody>
              {uniqueRiskItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    ไม่พบข้อมูลในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                uniqueRiskItems.map((item, index) => {
                  const itemIncidents = riskItemsMap.get(item) || [];
                  let rowTotal = 0;

                  // Get latest incident for this item for the text fields
                  const latestInc = itemIncidents.sort(
                    (a, b) =>
                      new Date(b.incident_date).getTime() -
                      new Date(a.incident_date).getTime(),
                  )[0];

                  return (
                    <tr
                      key={index}
                      className="bg-white hover:bg-slate-50 transition-colors"
                    >
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-slate-200 px-4 py-2 font-medium text-slate-800">
                        {item}
                      </td>

                      {columns.map((col) => {
                        let count = 0;
                        if (viewMode === "monthly") {
                          count = itemIncidents.filter((inc) =>
                            inc.incident_date.endsWith(`-${col.key}`),
                          ).length;
                        } else {
                          count = itemIncidents.filter(
                            (inc) =>
                              inc.incident_date.split("-")[1] === col.key,
                          ).length;
                        }
                        rowTotal += count;
                        return (
                          <td
                            key={col.key}
                            className="border border-slate-200 px-1 py-2 text-center text-slate-600"
                          >
                            {count > 0 ? (
                              count
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800">
                        {rowTotal}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {renderTrendChart(itemIncidents, index)}
                      </td>
                      <td className="border border-slate-200 px-4 py-2 text-xs text-slate-600 whitespace-pre-wrap">
                        {latestInc?.initial_response || "-"}
                      </td>
                      <td className="border border-slate-200 px-4 py-2 text-xs text-slate-600 whitespace-pre-wrap">
                        {latestInc?.guideline || "-"}
                      </td>
                      <td className="border border-slate-200 px-4 py-2 text-xs text-slate-600"></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
