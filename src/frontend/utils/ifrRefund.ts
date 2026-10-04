export const REFUND_IC_NUMBERS = new Set([
  "830911015389",
  "170911101323",
  "140718101527",
  "130305100578",
  "731025035493",
  "030709140471",
  "130222140873",
  "550526115037",
  "120611100972",
  "090506101098",
  "061126100306",
  "770604055506",
  "091223141377",
  "100808030420",
  "760420095045",
  "760608085922",
  "739628125613"
]);

export function isRefundEligibleIc(icNumber?: string): boolean {
  if (!icNumber) return false;
  const digits = icNumber.replace(/\D/g, "");
  return REFUND_IC_NUMBERS.has(digits);
}
