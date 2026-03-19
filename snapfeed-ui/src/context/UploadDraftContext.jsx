import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const UploadDraftContext = createContext(null);

export function UploadDraftProvider({ children }) {
  const [videoFile, setVideoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const videoUrlRef = useRef("");
  const coverUrlRef = useRef("");

  const setVideo = useCallback((file) => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = file ? URL.createObjectURL(file) : "";
    setVideoFile(file || null);
  }, []);

  const setCover = useCallback((file) => {
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    coverUrlRef.current = file ? URL.createObjectURL(file) : "";
    setCoverFile(file || null);
  }, []);

  const reset = useCallback(() => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    videoUrlRef.current = "";
    coverUrlRef.current = "";
    setVideoFile(null);
    setCoverFile(null);
    setDescription("");
    setLocation("");
  }, []);

  const value = useMemo(
    () => ({
      videoFile,
      coverFile,
      description,
      location,
      videoPreviewUrl: videoUrlRef.current,
      coverPreviewUrl: coverUrlRef.current,
      setVideo,
      setCover,
      setDescription,
      setLocation,
      reset,
    }),
    [videoFile, coverFile, description, location, setVideo, setCover, reset]
  );

  return <UploadDraftContext.Provider value={value}>{children}</UploadDraftContext.Provider>;
}

export function useUploadDraft() {
  const ctx = useContext(UploadDraftContext);
  if (!ctx) throw new Error("useUploadDraft must be used within <UploadDraftProvider>");
  return ctx;
}

