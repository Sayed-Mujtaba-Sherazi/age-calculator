// Utility: clamp a number between min and max
function clampNumber(value, min, max) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return undefined;
  return Math.min(Math.max(numeric, min), max);
}

// Utility: check if day, month, year compose a real calendar date
function isValidDateTriple(day, month, year) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && (candidate.getMonth() + 1) === month && candidate.getDate() === day;
}

// Utility: format integer safely for display
function formatInteger(value) {
  return Number.isFinite(value) ? String(value) : "--";
}

// Compute age difference in years, months, days using borrowing logic
function computeAgeParts(birthDate, referenceDate = new Date()) {
  const birth = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  if (birth > today) {
    return null; // invalid: in the future
  }

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    // borrow days from previous month relative to today
    const daysInPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

// Animate numbers counting up to a target value
function animateCount(element, toValue, durationMs = 700) {
  const start = performance.now();
  const fromValue = 0;
  const target = Math.max(0, toValue | 0);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const elapsed = now - start;
    const pct = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(pct);
    const current = Math.round(fromValue + (target - fromValue) * eased);
    element.textContent = formatInteger(current);
    element.setAttribute("data-value", formatInteger(current));
    if (pct < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Manage DOM
const form = document.getElementById("age-form");
const dayInput = document.getElementById("day");
const monthInput = document.getElementById("month");
const yearInput = document.getElementById("year");
const yearsValue = document.getElementById("years-value");
const monthsValue = document.getElementById("months-value");
const daysValue = document.getElementById("days-value");
const formError = document.getElementById("form-error");

const fieldErrorById = {
  day: document.getElementById("day-error"),
  month: document.getElementById("month-error"),
  year: document.getElementById("year-error"),
};

function setFieldError(input, message) {
  const id = input.id;
  const errorEl = fieldErrorById[id];
  if (!errorEl) return;
  errorEl.textContent = message || "";
  input.classList.toggle("invalid", Boolean(message));
}

function clearAllErrors() {
  formError.textContent = "";
  [dayInput, monthInput, yearInput].forEach((el) => setFieldError(el, ""));
}

function sanitizeNumericInput(event) {
  // Keep only digits; allow empty for usability
  const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
  if (event.target.value !== digitsOnly) {
    const cursorPos = event.target.selectionStart - (event.target.value.length - digitsOnly.length);
    event.target.value = digitsOnly;
    event.target.setSelectionRange(cursorPos, cursorPos);
  }
}

[dayInput, monthInput, yearInput].forEach((input) => {
  input.addEventListener("input", (e) => {
    sanitizeNumericInput(e);
    setFieldError(input, ""); // clear field error on change
    formError.textContent = "";
  });
});

form.addEventListener("reset", () => {
  clearAllErrors();
  [yearsValue, monthsValue, daysValue].forEach((el) => {
    el.textContent = "--";
    el.setAttribute("data-value", "--");
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearAllErrors();

  const dayRaw = dayInput.value.trim();
  const monthRaw = monthInput.value.trim();
  const yearRaw = yearInput.value.trim();

  let hasError = false;

  if (dayRaw.length === 0) { setFieldError(dayInput, "Day is required"); hasError = true; }
  if (monthRaw.length === 0) { setFieldError(monthInput, "Month is required"); hasError = true; }
  if (yearRaw.length === 0) { setFieldError(yearInput, "Year is required"); hasError = true; }

  if (hasError) {
    formError.textContent = "Please fill all required fields.";
    return;
  }

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  // Basic range checks
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    setFieldError(dayInput, "Enter a valid day (1-31)");
    hasError = true;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    setFieldError(monthInput, "Enter a valid month (1-12)");
    hasError = true;
  }
  const currentYear = new Date().getFullYear();
  const minYear = 1900;
  if (!Number.isInteger(year) || year < minYear || year > currentYear) {
    setFieldError(yearInput, `Enter a valid year (${minYear}-${currentYear})`);
    hasError = true;
  }

  if (hasError) {
    formError.textContent = "Fix the highlighted fields.";
    return;
  }

  if (!isValidDateTriple(day, month, year)) {
    formError.textContent = "The date entered is not a valid calendar date.";
    // highlight day/month depending which is more likely the issue
    setFieldError(dayInput, "");
    setFieldError(monthInput, "");
    setFieldError(yearInput, "");
    [dayInput, monthInput].forEach((el) => el.classList.add("invalid"));
    return;
  }

  const birthDate = new Date(year, month - 1, day);
  const parts = computeAgeParts(birthDate, new Date());
  if (!parts) {
    formError.textContent = "Birth date cannot be in the future.";
    [dayInput, monthInput, yearInput].forEach((el) => el.classList.add("invalid"));
    return;
  }

  // Animate results
  animateCount(yearsValue, parts.years);
  animateCount(monthsValue, parts.months);
  animateCount(daysValue, parts.days);
});

// Keyboard enhancements: Up/Down arrows to increment/decrement values within range
function nudgeValue(input, delta, min, max) {
  const raw = input.value.trim();
  if (raw === "") return;
  const numeric = Number(raw);
  if (!Number.isInteger(numeric)) return;
  const next = clampNumber(numeric + delta, min, max);
  if (next === undefined) return;
  input.value = String(next);
}

dayInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); nudgeValue(dayInput, +1, 1, 31); }
  if (e.key === "ArrowDown") { e.preventDefault(); nudgeValue(dayInput, -1, 1, 31); }
});
monthInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); nudgeValue(monthInput, +1, 1, 12); }
  if (e.key === "ArrowDown") { e.preventDefault(); nudgeValue(monthInput, -1, 1, 12); }
});
yearInput.addEventListener("keydown", (e) => {
  const currentYear = new Date().getFullYear();
  if (e.key === "ArrowUp") { e.preventDefault(); nudgeValue(yearInput, +1, 1900, currentYear); }
  if (e.key === "ArrowDown") { e.preventDefault(); nudgeValue(yearInput, -1, 1900, currentYear); }
});


