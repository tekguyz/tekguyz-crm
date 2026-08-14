import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

// One row is `cold` so the Going Cold treatment can be compared against the
// Card above it — the same overdue lead has to read the same in both shapes.
const ROWS = [
  { company: "Northwind Traders", owner: "Alex", next: "Tomorrow" },
  { company: "Contoso Ltd", owner: "Sam", next: "Overdue", cold: true },
  { company: "Fabrikam Inc", owner: "Jo", next: "Next week" },
  { company: "Tailspin Toys", owner: "Riley", next: "In 3 days" },
];

export function TableSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Table</h3>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
            <TableHeaderCell>Next action</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map(({ company, owner, next, cold }) => (
            <TableRow key={company} cold={cold}>
              <TableCell>{company}</TableCell>
              <TableCell>{owner}</TableCell>
              <TableCell>{next}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
