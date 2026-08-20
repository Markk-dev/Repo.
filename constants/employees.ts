// Employee credentials for authentication
// To add more employees, add entries to this array

export interface Employee {
  employeeId: string;
  name: string;
  position: string;
  program: string;
  password: string;
}

export const EMPLOYEES: Employee[] = [
  {
    employeeId: "26-008-0005",
    name: "Mark Vincent Madrid",
    position: "Administrative Assistant",
    program: "SAHS",
    password: "26-008-0005",
  },
];
