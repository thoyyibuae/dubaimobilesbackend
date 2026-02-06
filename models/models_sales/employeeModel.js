// export const EmployeeSchema = {
//   employee_id: "number",
//   employee_code: "string",
//   first_name: "string",
//   last_name: "string",
//   email: "string",
//   phone: "string",
//   department: "string",
//   position: "string",
//   salary: "number",
//   created_at: "timestamp",
//   image_url: "string",
// };




export const EmployeeSchema = {
  employee_id: "number" ,
  employee_code: "string" ,
  first_name: "string" ,
  last_name: "string" ,
  email: "string" ,
  phone: "string" ,
  department: "string",
  position: "string",
  salary: "number",
  created_at: "timestamp" ,
  image_url: "string" ,
} ;

// Type derived from the schema
// export type Employee = {
//   [K in keyof typeof EmployeeSchema]: 
//     typeof EmployeeSchema[K] extends "number" ? number :
//     typeof EmployeeSchema[K] extends "string" ? string :
//     typeof EmployeeSchema[K] extends "timestamp" ? Date :
//     never;
// };