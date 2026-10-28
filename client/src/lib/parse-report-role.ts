/** Parse catalog role lines for function «Reports» (English or Arabic bracket prefix). */
export interface ParsedReportRole {
  subArea: string;
  reportName: string;
  description: string;
  owner: string;
  outputs: string;
}

export function parseReportRole(role: string): ParsedReportRole {
  const subMatch = role.match(/^\[([^\]]+)\]\s*/);
  const subArea = subMatch?.[1]?.trim() ?? "";
  let rest = subMatch ? role.slice(subMatch[0].length) : role;

  const outputsMarker = " | Outputs:";
  const outputsMarkerAr = " | المخرجات:";
  let outputs = "";
  const outIdx =
    rest.indexOf(outputsMarkerAr) >= 0
      ? rest.indexOf(outputsMarkerAr)
      : rest.indexOf(outputsMarker);
  if (outIdx >= 0) {
    const marker =
      rest.indexOf(outputsMarkerAr) === outIdx ? outputsMarkerAr : outputsMarker;
    outputs = rest.slice(outIdx + marker.length).trim();
    rest = rest.slice(0, outIdx).trim();
  }

  const ownerEn = rest.match(/\(Owner:\s*([^)]+)\)\s*$/i);
  const ownerAr = rest.match(/\(المسؤول:\s*([^)]+)\)\s*$/);
  const ownerMatch = ownerAr ?? ownerEn;
  const owner = ownerMatch?.[1]?.trim() ?? "";
  if (ownerMatch?.index != null) {
    rest = rest.slice(0, ownerMatch.index).trim();
  }

  const dash = rest.indexOf(" — ");
  const reportName = (dash >= 0 ? rest.slice(0, dash) : rest).trim();
  const description = dash >= 0 ? rest.slice(dash + 3).trim() : "";

  return { subArea, reportName, description, owner, outputs };
}

export function isReportsFunction(functionName: string): boolean {
  return functionName.trim().toLowerCase() === "reports";
}
