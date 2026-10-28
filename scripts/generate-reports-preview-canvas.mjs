import fs from "fs";

const preview = JSON.parse(
  fs.readFileSync(
    "c:/Cursor/Role-Privileges-Manager/scripts/oracle-reports-preview.json",
    "utf8",
  ),
);

const DATA = {
  totalReports: preview.totalReports,
  modules: preview.modules.map((m) => ({
    module: m.module,
    moduleAr:
      m.module === "Finance"
        ? "المالية"
        : m.module === "HR"
          ? "الموارد البشرية"
          : "سلسلة الإمداد",
    reportCount: m.reportCount,
    subAreas: m.subAreas,
    sampleReports: m.reports.slice(0, 35),
  })),
};

const canvas = `import { useMemo, useState } from "react";
import {
  useHostTheme,
  Stack,
  H1,
  H2,
  H3,
  Text,
  Row,
  Stat,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Pill,
  Select,
  Table,
  Callout,
  CollapsibleSection,
  Divider,
} from "cursor/canvas";

const DATA = ${JSON.stringify(DATA, null, 2)} as const;

type ReportRow = (typeof DATA.modules)[number]["sampleReports"][number];

export default function OracleReportsCatalogPreview() {
  const theme = useHostTheme();
  const [module, setModule] = useState<string>("Finance");
  const [subArea, setSubArea] = useState<string>("__all__");

  const mod = useMemo(
    () => DATA.modules.find((m) => m.module === module) ?? DATA.modules[0],
    [module],
  );

  const subOptions = useMemo(
    () => [
      { value: "__all__", label: "All sub-areas" },
      ...mod.subAreas.map((s) => ({
        value: s.name,
        label: \`\${s.name} (\${s.count})\`,
      })),
    ],
    [mod],
  );

  const filtered = useMemo(() => {
    if (subArea === "__all__") return mod.sampleReports;
    return mod.sampleReports.filter((r) => r.subArea === subArea);
  }, [mod, subArea]);

  const tableHeaders = [
    "Sub Area (CSV)",
    "Report Name",
    "Description",
    "Owner",
    "Output fields",
  ];

  const tableRows = filtered.map((r: ReportRow) => [
    r.subArea,
    r.reportName,
    r.description || "—",
    r.owner || "—",
    (r.output || "—").replace(/\\s+/g, " ").slice(0, 140) +
      ((r.output || "").length > 140 ? "…" : ""),
  ]);

  const subAreaRows = mod.subAreas.map((s) => [
    s.name,
    String(s.count),
    "",
    "",
    "",
  ]);

  return (
    <Stack gap={20} style={{ padding: 20, color: theme.text.primary }}>
      <Stack gap={6}>
        <H1>Oracle Reports → RPM catalog preview</H1>
        <Text style={{ color: theme.text.secondary, maxWidth: 720 }}>
          Proposed mapping before import: one function Reports (
          <span dir="rtl">التقارير</span>) per module. Each CSV row becomes one
          catalog role carrying sub-area, name, description, owner, and outputs
          (same columns as your file).
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat label="Total reports (CSV)" value={String(DATA.totalReports)} />
        {DATA.modules.map((m) => (
          <Stat
            key={m.module}
            label={\`\${m.module} → Reports\`}
            value={String(m.reportCount)}
          />
        ))}
      </Grid>

      <Callout tone="info">
        Full import adds {DATA.totalReports} privileges (not added yet). This
        canvas shows structure + up to 35 sample rows per module. HR rows from HCM
        include Arabic report names/descriptions from the CSV as-is.
      </Callout>

      <Card>
        <CardHeader>How it appears in Company Access Overview (Arabic UI)</CardHeader>
        <CardBody>
          <Stack gap={10}>
            <Row gap={8} wrap>
              <Pill tone="neutral">Module: {mod.moduleAr}</Pill>
              <Pill tone="info">Function: التقارير</Pill>
              <Pill tone="neutral">{mod.reportCount} roles</Pill>
            </Row>
            <div
              style={{
                border: \`1px solid \${theme.stroke.primary}\`,
                borderRadius: 8,
                padding: 12,
                background: theme.bg.elevated,
              }}
            >
              <Text weight="medium" style={{ marginBottom: 8 }}>
                Expanded employee tree (concept)
              </Text>
              <Stack gap={6} style={{ fontSize: 13, lineHeight: 1.45 }}>
                <Text>▾ {mod.moduleAr}</Text>
                <Text style={{ paddingInlineStart: 16 }}>▾ التقارير</Text>
                <Text
                  style={{
                    paddingInlineStart: 32,
                    color: theme.text.secondary,
                  }}
                >
                  ▸ [Sub Area] Report name — description…
                </Text>
                <Text
                  style={{
                    paddingInlineStart: 32,
                    color: theme.text.secondary,
                  }}
                >
                  • Role line matches CSV: Sub Area, Report Name, Description,
                  Owner, Outputs (may wrap in UI with dir="auto")
                </Text>
              </Stack>
            </div>
            <Text style={{ color: theme.fg.secondary, fontSize: 12 }}>
              Example role string stored in catalog (English Finance row):{" "}
              <code style={{ fontSize: 11 }}>
                [General Ledger] DB - Trial Balance Detail - New — … (Owner: …) |
                Outputs: …
              </code>
            </Text>
          </Stack>
        </CardBody>
      </Card>

      <Row gap={12} wrap align="end">
        <Stack gap={4}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>Module</Text>
          <Select
            value={module}
            onChange={setModule}
            options={DATA.modules.map((m) => ({
              value: m.module,
              label: \`\${m.module} (\${m.reportCount})\`,
            }))}
          />
        </Stack>
        <Stack gap={4} style={{ minWidth: 280 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Sub Area filter (preview sample)
          </Text>
          <Select
            value={subArea}
            onChange={setSubArea}
            options={subOptions}
          />
        </Stack>
      </Row>

      <CollapsibleSection
        title={\`\${mod.module} / Reports — sub-areas (\${mod.subAreas.length})\`}
        defaultOpen
      >
        <Table
          headers={["Sub Area", "Report count", "", "", ""]}
          rows={subAreaRows}
          striped
        />
      </CollapsibleSection>

      <Stack gap={8}>
        <H2>
          Sample rows ({filtered.length} of {mod.reportCount} in {mod.module})
        </H2>
        <Table headers={tableHeaders} rows={tableRows} striped stickyHeader />
      </Stack>

      <Divider />
      <H3>After you approve</H3>
      <Text style={{ color: theme.text.secondary }}>
        We will append {DATA.totalReports} privileges to data.json, add Arabic
        function label «التقارير», and generate role translations (HR reports
        already Arabic in CSV). Optional: shorten role text to report name only
        with metadata in description fields if lines feel too long.
      </Text>
    </Stack>
  );
}
`;

const out =
  "C:/Users/{DS}WaleedAlahdal/.cursor/projects/c-Cursor-Role-Privileges-Manager/canvases/oracle-reports-catalog-preview.canvas.tsx";
fs.writeFileSync(out, canvas);
console.log("Wrote canvas", out);
