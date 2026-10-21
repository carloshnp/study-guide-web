/**
 * GFM tables (`DataTable` in the component map).
 *
 * A markdown table is the widest thing in a chapter and the reader must never
 * scroll the page sideways (`horizontal-scroll`): every table gets a labelled,
 * keyboard-focusable scroll region of its own. Header cells carry `scope="col"`,
 * numeric cells are right-aligned with tabular figures (`number-tabular`), and a
 * table of five columns or more pins its first column from `md` up so the row
 * label stays readable while the rest scrolls (MASTER.md › Tables).
 *
 * The column count and the accessible name are read from the hast node, not
 * guessed from React children, so they match what the source markdown declared.
 * GFM alignment arrives as an inline `text-align` style, which would fight the
 * tabular right alignment; the reader owns alignment, so it is dropped.
 */

import { elementChildren, firstChildWithTag, textOfNode } from "../hast"
import type { MdProps } from "./types"

const PLAIN_NUMBER = /^[−+-]?\d+(?:[.,]\d+)?$/
const NUMBER_WITH_UNIT =
  /^[−+-]?\d+(?:[.,]\d+)?\s*(?:%|‰|°[CF]?|at%|vol%|ppm|kg|mg|µm|μm|nm|mm|cm|km|m|min|ms|s|h|K|MPa|GPa|kPa|Pa|HV|HB|HRc|J|kJ|W|kW|kN|N|mol|g)$/i

/**
 * `69`, `0,85`, `660 °C` are numbers, `3XXX`, `GPa` and `Al-4%Cu` are not. The
 * unit list is a whitelist on purpose: a designation like `3XXX` starts with a
 * digit and would otherwise be right-aligned as if it were a measurement.
 */
export function isNumericCell(text: string): boolean {
  const value = text.trim()
  if (value === "") return false
  return PLAIN_NUMBER.test(value) || NUMBER_WITH_UNIT.test(value)
}

function headRow(node: unknown): unknown {
  const head = firstChildWithTag(node, "thead") ?? firstChildWithTag(node, "tbody")
  return elementChildren(head)[0]
}

export function tableColumnCount(node: unknown): number {
  return elementChildren(headRow(node)).length
}

export function tableHeaderTexts(node: unknown): string[] {
  return elementChildren(headRow(node)).map((cell) => textOfNode(cell).trim())
}

export function tableLabel(node: unknown): string {
  const headers = tableHeaderTexts(node).filter((header) => header !== "")
  if (headers.length === 0) return "Tabela"
  const shown = headers.slice(0, 4).join(" · ")
  return headers.length > 4 ? `Tabela: ${shown}…` : `Tabela: ${shown}`
}

/** `table` — the labelled scroll region around the table itself. */
export function ChapterTable({ node, children, ...props }: MdProps<"table">) {
  const columns = tableColumnCount(node)

  return (
    <div
      aria-label={tableLabel(node)}
      className="mt-6 overflow-x-auto rounded-lg border border-border"
      data-slot="table-region"
      role="region"
      tabIndex={0}
    >
      <table
        className="chapter-table w-full border-collapse text-table text-foreground"
        data-columns={columns}
        data-sticky-first={columns >= 5 ? "true" : undefined}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function ChapterTableHead({ children }: MdProps<"thead">) {
  return <thead className="[&_th]:border-b [&_th]:border-border">{children}</thead>
}

export function ChapterTableBody({ children }: MdProps<"tbody">) {
  return <tbody>{children}</tbody>
}

export function ChapterTableRow({ children }: MdProps<"tr">) {
  return (
    <tr className="border-b border-border align-top last:border-0 [&:nth-child(even)]:bg-code/60">
      {children}
    </tr>
  )
}

export function ChapterTableHeadCell({ children, node: _node, style: _style, ...props }: MdProps<"th">) {
  return (
    <th
      className="bg-code px-3 py-2 text-start text-meta font-semibold text-foreground"
      scope="col"
      {...props}
    >
      {children}
    </th>
  )
}

export function ChapterTableCell({
  node,
  children,
  style: _style,
  ...props
}: MdProps<"td">) {
  const numeric = isNumericCell(textOfNode(node))

  return (
    <td
      className={`px-3 py-2 ${numeric ? "text-end tabular-nums" : "text-start"}`}
      data-numeric={numeric ? "true" : undefined}
      {...props}
    >
      {children}
    </td>
  )
}
