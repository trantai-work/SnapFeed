import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import UploadContent from "../components/MainContent/UploadContent";
import FeedContent from "../components/MainContent/FeedContent";
import VideoUploadPage from "../pages/VideoUploadPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />}>
        <Route index element={<FeedContent />} />
        <Route path="upload" element={<UploadContent />} />
      </Route>

      <Route path="/upload/video" element={<VideoUploadPage />} />
    </Routes>
  );
}

export default AppRoutes;