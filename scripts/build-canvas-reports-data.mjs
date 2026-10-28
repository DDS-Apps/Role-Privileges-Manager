import fs from "fs";

const preview = JSON.parse(
  fs.readFileSync(
    "c:/Cursor/Role-Privileges-Manager/scripts/oracle-reports-preview.json",
    "utf8",
  ),
);

const canvasData = {
  totalReports: preview.totalReports,
  mappingNote:
    "CSV Title → RPM module: Finance→Finance, SCM→SCM, HCM→HR. Each report becomes one privilege role under function «Reports».",
  modules: preview.modules.map((m) => ({
    module: m.module,
    functionName: "Reports",
    functionAr: "التقارير",
    reportCount: m.reportCount,
    subAreas: m.subAreas,
    // Up to 40 reports for interactive preview table
    sampleReports: m.reports.slice(0, 40),
  })),
};

const outPath =
  "C:/Users/{DS}WaleedAlahdal/.cursor/projects/c-Cursor-Role-Privileges-Manager/canvases/oracle-reports-data.json";
fs.mkdirSync(
  "C:/Users/{DS}WaleedAlahdal/.cursor/projects/c-Cursor-Role-Privileges-Manager/canvases",
  { recursive: true },
);
fs.writeFileSync(outPath, JSON.stringify(canvasData));

console.log("Wrote", outPath);
