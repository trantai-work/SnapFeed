import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import UploadContent from "../components/MainContent/UploadContent";
import FeedContent from "../components/MainContent/FeedContent";
import VideoUploadPage from "../pages/VideoUploadPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import DeleteDataPage from "../pages/DeleteDataPage";
import ProfilePage from "../pages/ProfilePage";
import ChatsPage from "../pages/ChatsPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />}>
        <Route index element={<FeedContent />} />
        <Route path="upload" element={<UploadContent />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
        <Route path="chats" element={<ChatsPage />} />
      </Route>

      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/delete-data" element={<DeleteDataPage />} />

      <Route path="/upload/video" element={<VideoUploadPage />} />
    </Routes>
  );
}

export default AppRoutes;