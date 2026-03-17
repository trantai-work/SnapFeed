import React from "react";
import { useAuth } from "../context/AuthContext";

export default function RightActions() {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return null;

    return (
        <div className="fixed top-4 right-6 z-50 flex items-center bg-[#1f1f1f] px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
            {!isAuthenticated ? (
                <button
                    className="text-sm text-white px-6 py-2 rounded-full font-semibold"
                    style={{ backgroundColor: '#FE2C55' }}
                >
                    Đăng nhập
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    {user.avatarUrl && (
                        <img
                            src={user.avatarUrl}
                            alt={user.username || ""}
                            className="w-9 h-9 rounded-full object-cover"
                        />
                    )}
                    <span className="font-semibold text-white">
                        {user.firstName || ""} {user.lastName || user.username}
                    </span>
                </div>
            )}
        </div>
    );
}