import * as Yup from "yup";

export const loginSchema = Yup.object().shape({
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  password: Yup.string().min(6, "Must be at least 6 characters").required("Password is required"),
});

export const registerSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  password: Yup.string().min(6, "Must be at least 6 characters").required("Password is required"),
});
