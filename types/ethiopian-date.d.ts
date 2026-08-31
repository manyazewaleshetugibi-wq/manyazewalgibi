declare module "ethiopian-date" {
  export function toEthiopian(
    gregorianYear: number,
    gregorianMonth: number,
    gregorianDay: number
  ): [number, number, number];
  export function toGregorian(
    ethiopianYear: number,
    ethiopianMonth: number,
    ethiopianDay: number
  ): [number, number, number];
}
