import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Home } from "./components/Home";
import { Profile } from "./components/Profile";
import { Projects } from "./components/Projects";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { ForgotPassword } from "./components/ForgotPassword";
import { ResetPassword } from "./components/ResetPassword";
import { ActivateAccount } from "./components/ActivateAccount";
import { ChangePassword } from "./components/ChangePassword";

interface RouterConfig {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

export const createAppRouter = ({ isAuthenticated, setIsAuthenticated }: RouterConfig) => {
  return createBrowserRouter([
    {
      path: "/",
      element: <Root isAuthenticated={isAuthenticated} />,
      children: [
        { index: true, element: <Home /> },
        {
          path: "login",
          element: isAuthenticated ? <Navigate to="/" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />,
        },
        {
          path: "register",
          element: isAuthenticated ? <Navigate to="/" replace /> : <Register />,
        },
        { path: "forgot-password", element: <ForgotPassword /> },
        { path: "reset-password/:token", element: <ResetPassword /> },
        { path: "activate/:token", element: <ActivateAccount /> },
        {
          path: "profile",
          element: isAuthenticated ? <Profile /> : <Navigate to="/login" replace />,
        },
        {
          path: "change-password",
          element: isAuthenticated ? <ChangePassword /> : <Navigate to="/login" replace />,
        },
        {
          path: "projects",
          element: isAuthenticated ? <Projects /> : <Navigate to="/login" replace />,
        },
      ],
    },
  ]);
};
