import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import UploadContent from "../components/MainContent/UploadContent";
import FeedContent from "../components/MainContent/FeedContent";
import VideoUploadPage from "../pages/VideoUploadPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import DeleteDataPage from "../pages/DeleteDataPage";
import ProfilePage from "../pages/ProfilePage";
import ChatsPage from "../pages/ChatsPage";
import SearchPage from "../pages/SearchPage";
import ExplorePage from "../pages/ExplorePage";
import ModeratorLoginPage from "../pages/ModeratorLoginPage";
import ModeratorDashboardPage from "../pages/ModeratorDashboardPage";
import SupportHistoryPage from "../pages/SupportHistoryPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />}>
        <Route index element={<FeedContent />} />
        <Route path="upload" element={<UploadContent />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="support" element={<SupportHistoryPage />} />
      </Route>

      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/delete-data" element={<DeleteDataPage />} />
      <Route path="/moderator/login" element={<ModeratorLoginPage />} />
      <Route path="/moderator" element={<ModeratorDashboardPage />} />

      <Route path="/upload/video" element={<VideoUploadPage />} />
    </Routes>
  );
}

export default AppRoutes;
