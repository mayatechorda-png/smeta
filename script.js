"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const addButton = document.querySelector("#add-item");
const dateField = document.querySelector("#estimate-date");
const numberField = document.querySelector("#estimate-number");
const printButton = document.querySelector("#print");
const printTitle = document.querySelector("#print-title");
const adjustments = document.querySelector(".adjustments");
const discountField = document.querySelector("#discount-rate");
const taxField = document.querySelector("#tax-rate");
const currencyField = document.querySelector("#currency");
const newButton = document.querySelector("#new-estimate");
const copyButton = document.querySelector("#copy-estimate");
const copyStatus = document.querySelector("#copy-status");
const copyFallback = document.querySelector("#copy-fallback");
const copyText = document.querySelector("#copy-text");
const detailFields = [
  document.querySelector("#sender"), document.querySelector("#recipient"), numberField, dateField,
  discountField, taxField, currencyField, document.querySelector("#comment")
];
const defaults = Object.fromEntries(detailFields.map((field) => [field.id, field.value]));
const itemKeys = ["name", "quantity", "unit", "price"];
const storageKey = "smeta-draft-v1";
const amounts = {
  subtotal: document.querySelector("#subtotal"),
  discount: document.querySelector("#discount"),
  discounted: document.querySelector("#discounted"),
  tax: document.querySelector("#tax"),
  total: document.querySelector("#total")
};
const integerFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 20 });
let statusTimer;

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function estimateTitle() {
  const date = dateField.value.split("-").reverse().join(".");
  return `Смета № ${numberField.value.trim() || "—"} от ${date || "—"}`;
}

function preparePrint() {
  printTitle.textContent = estimateTitle();
  for (const field of document.querySelectorAll("[data-print]")) {
    field.nextElementSibling.textContent = field.dataset.field === "price" && field.value.trim()
      ? formatMoney(readNumber(field.value), decimalFormat)
      : field.value;
  }
}

function readNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, formatter) {
  return formatter.format(value).replace(/\s/g, " ");
}

function formatMoney(value, formatter = integerFormat) {
  return `${formatNumber(value, formatter)} ${currencyField.value}`;
}

function roundMoney(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function lineTotal(row) {
  const quantity = readNumber(itemField(row, "quantity").value);
  const price = readNumber(itemField(row, "price").value);
  return roundMoney(quantity * price);
}

function calculate() {
  let subtotal = 0;
  for (const row of items.rows) {
    const amount = lineTotal(row);
    row.querySelector(".line-amount").textContent = formatMoney(amount);
    subtotal += amount;
  }
  subtotal = roundMoney(subtotal);
  const discount = roundMoney(subtotal * (Math.min(readNumber(discountField.value), 100) / 100));
  const discounted = subtotal - discount;
  const tax = roundMoney(discounted * (readNumber(taxField.value) / 100));
  const total = roundMoney(discounted + tax);

  for (const [key, value] of Object.entries({ subtotal, discount, discounted, tax, total })) {
    amounts[key].textContent = formatMoney(key === "discount" && value ? -value : value);
  }
  amounts.discount.parentElement.hidden = discount === 0;
  amounts.discounted.parentElement.hidden = discount === 0 || discounted === 0;
  amounts.tax.parentElement.hidden = tax === 0;

  return { discount, tax, total };
}

function itemField(row, key) {
  return row.querySelector(`[data-field="${key}"]`);
}

function setField(field, value) {
  if (typeof value !== "string") return;
  if (field.options && !Array.from(field.options).some((option) => option.value === value)) return;
  field.value = value;
}

function addItem(values = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  for (const key of itemKeys) setField(itemField(row, key), values[key]);
  items.append(row);
  return row;
}

function saveDraft() {
  const details = Object.fromEntries(detailFields.map((field) => [field.id, field.value]));
  const positions = Array.from(items.rows, (row) =>
    Object.fromEntries(itemKeys.map((key) => [key, itemField(row, key).value]))
  );
  try {
    localStorage.setItem(storageKey, JSON.stringify({ details, positions }));
  } catch {
    // Draft storage may be unavailable when opening a local file.
  }
}

function restoreDraft() {
  let draft;
  try {
    draft = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    // Start with the default fields when no usable draft is available.
  }
  for (const field of detailFields) setField(field, draft?.details?.[field.id]);
  if (Array.isArray(draft?.positions)) {
    for (const values of draft.positions) {
      if (values && typeof values === "object") addItem(values);
    }
  } else {
    addItem();
  }
}

function clearCopyFeedback() {
  clearTimeout(statusTimer);
  copyStatus.textContent = "";
  copyFallback.hidden = true;
  copyText.value = "";
}

function newEstimate() {
  if (!window.confirm("Начать новую смету? Текущий черновик будет очищен.")) return;
  const currentNumber = numberField.value.trim();
  const nextNumber = /^\d+$/.test(currentNumber) ? String(BigInt(currentNumber) + 1n) : defaults[numberField.id];
  for (const field of detailFields) field.value = defaults[field.id];
  numberField.value = nextNumber;
  dateField.value = today();
  items.replaceChildren();
  addItem();
  clearCopyFeedback();
  calculate();
  saveDraft();
}

function whatsappText() {
  const { discount, tax, total } = calculate();
  const lines = [estimateTitle(), ""];
  for (const row of items.rows) {
    const name = itemField(row, "name").value.trim();
    const quantity = itemField(row, "quantity").value.trim();
    const price = itemField(row, "price").value.trim();
    if (!name && !quantity && !price) continue;
    const unit = itemField(row, "unit").value;
    const quantityText = formatNumber(readNumber(quantity), decimalFormat);
    const priceText = formatMoney(readNumber(price), decimalFormat);
    lines.push(`• ${name || "Без наименования"} — ${quantityText} ${unit} × ${priceText} = ${formatMoney(lineTotal(row))}`);
  }
  if (discount) lines.push(`Скидка: ${formatMoney(-discount)}`);
  if (tax) lines.push(`НДС: ${formatMoney(tax)}`);
  lines.push(`Итого к оплате: ${formatMoney(total)}`);
  return lines.join("\n");
}

async function copyEstimate() {
  clearCopyFeedback();
  const text = whatsappText();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copyFallback.hidden = false;
    copyText.value = text;
    copyText.focus();
    copyText.select();
    return;
  }
  copyStatus.textContent = "Скопировано ✓";
  statusTimer = setTimeout(() => { copyStatus.textContent = ""; }, 2000);
}

function addPosition() {
  const row = addItem();
  calculate();
  saveDraft();
  itemField(row, "name").focus();
}

addButton.addEventListener("click", addPosition);
newButton.addEventListener("click", newEstimate);
copyButton.addEventListener("click", copyEstimate);
printButton.addEventListener("click", () => {
  preparePrint();
  window.print();
});
window.addEventListener("beforeprint", preparePrint);
items.addEventListener("input", calculate);
adjustments.addEventListener("input", calculate);
document.querySelector(".estimate").addEventListener("input", saveDraft);
items.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-item");
  if (!button) return;
  const row = button.closest("tr");
  const neighbor = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  (neighbor ? itemField(neighbor, "name") : addButton).focus();
  calculate();
  saveDraft();
});
items.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing || event.repeat || !event.target.matches("input")) return;
  const row = event.target.closest("tr");
  if (row !== items.lastElementChild) return;
  event.preventDefault();
  addPosition();
});

dateField.value = today();
restoreDraft();
calculate();
