import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardHome from "@/pages/DashboardHome";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import Videos from "@/pages/Videos";
import Users from "@/pages/Users";
import Comments from "@/pages/Comments";
import Community from "@/pages/Community";
import Events from "@/pages/Events";
import Login from "@/pages/Login";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AccountDeletion from "@/pages/AccountDeletion";
import Notifications from "@/pages/Notifications";
import RequireAuth from "@/components/RequireAuth";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id" element={<CourseDetails />} />
            <Route path="videos" element={<Videos />} />
            <Route path="users" element={<Users />} />
            <Route path="comments" element={<Comments />} />
            <Route path="community" element={<Community />} />
            <Route path="events" element={<Events />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
