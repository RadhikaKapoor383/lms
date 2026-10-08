import * as Yup from "yup";

export const loginSchema = Yup.object().shape({
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  password: Yup.string().min(8, "Must be at least 8 characters").required("Password is required"),
});

export const registerSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  password: Yup.string().min(8, "Must be at least 8 characters").required("Password is required"),
});

export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email("Enter a valid email").required("Email is required"),
});

// 72 matches the server: bcrypt ignores everything after 72 bytes.
export const resetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .max(72, "Must be at most 72 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords don't match")
    .required("Please confirm your password"),
});
