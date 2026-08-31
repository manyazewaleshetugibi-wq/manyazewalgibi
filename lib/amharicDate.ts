import { toEthiopian } from "ethiopian-date";

const ETHIOPIC_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ህዳር",
  "ታህሳስ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዚያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
];

const ETHIOPIC_WEEKDAYS = [
  "እሁድ",
  "ሰኞ",
  "ማክሰኞ",
  "ረቡዕ",
  "ሐሙስ",
  "ዓርብ",
  "ቅዳሜ",
];

export function ethiopicNumber(n: number): string {
  return String(n);
}

function eatParts(date: Date): { y: number; m: number; d: number; h: number; min: number; wd: number } {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    h: shifted.getUTCHours(),
    min: shifted.getUTCMinutes(),
    wd: shifted.getUTCDay(),
  };
}

export function ethiopianParts(date: Date): { year: number; month: number; day: number; weekday: string } {
  const { y, m, d, wd } = eatParts(date);
  const [ey, em, ed] = toEthiopian(y, m, d);
  return { year: ey, month: em, day: ed, weekday: ETHIOPIC_WEEKDAYS[wd] };
}

export function ethiopianMonthName(date: Date): string {
  const { month } = ethiopianParts(date);
  return ETHIOPIC_MONTHS[month - 1];
}

export function formatAmharicDate(date: Date): string {
  const { year, month, day, weekday } = ethiopianParts(date);
  return `${weekday}፣ ${ETHIOPIC_MONTHS[month - 1]} ${ethiopicNumber(day)}፣ ${ethiopicNumber(year)}`;
}

export function formatAmharicMonthYear(date: Date): string {
  const { year, month } = ethiopianParts(date);
  return `${ETHIOPIC_MONTHS[month - 1]} ${ethiopicNumber(year)}`;
}

export function formatAmharicShortDate(date: Date): string {
  const { month, day } = ethiopianParts(date);
  return `${ETHIOPIC_MONTHS[month - 1]} ${ethiopicNumber(day)}`;
}

export function formatAmharicTime(date: Date): string {
  const { h, min } = eatParts(date);
  const hour = ((h + 11) % 12) + 1;
  const period =
    h >= 5 && h < 12 ? "ጥዋት" : h >= 12 && h < 14 ? "ቀትር" : h >= 14 && h < 18 ? "ከሰዓት" : h >= 18 ? "ማታ" : "ሌሊት";
  const minutePart = min < 10 ? `:0${min}` : `:${min}`;
  return `${hour}${minutePart} ${period}`;
}

export function formatAmharicDateTime(date: Date): string {
  return `${formatAmharicDate(date)}፣ ${formatAmharicTime(date)}`;
}
