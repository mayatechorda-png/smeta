"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const addButton = document.querySelector("#add-item");
const dateField = document.querySelector("#estimate-date");
const totalOutput = document.querySelector("#total");
const integerFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return `${integerFormat.format(amount).replace(/\s/g, " ")} ₸`;
}

function lineTotal(row) {
  const quantity = readNumber(row.querySelector('[data-field="quantity"]').value);
  const price = readNumber(row.querySelector('[data-field="price"]').value);
  const amount = quantity * price;
  return Number.isFinite(amount) ? amount : 0;
}

function calculate() {
  let subtotal = 0;
  for (const row of items.rows) {
    const amount = lineTotal(row);
    row.querySelector(".line-amount").textContent = formatMoney(amount);
    subtotal += amount;
  }
  totalOutput.textContent = formatMoney(subtotal);
}

function addItem(focus = false) {
  const row = template.content.firstElementChild.cloneNode(true);
  items.append(row);
  if (focus) row.querySelector('[data-field="name"]').focus();
}

addButton.addEventListener("click", () => addItem(true));
items.addEventListener("input", calculate);
items.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-item");
  if (!button) return;
  const row = button.closest("tr");
  const neighbor = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  (neighbor?.querySelector('[data-field="name"]') || addButton).focus();
  calculate();
});
items.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing || event.repeat || !event.target.matches("input")) return;
  const row = event.target.closest("tr");
  if (row !== items.lastElementChild) return;
  event.preventDefault();
  addItem(true);
});

dateField.value = today();
addItem();
calculate();
