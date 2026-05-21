import { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Lock,
  Building2,
  Save,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Tags,
  Plus,
  Edit2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserOrganizations,
  setCurrentOrganization,
  getSessions,
  revokeSession,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  UserProfile,
  UserOrganization,
  Session,
  Label,
  LabelInput,
} from "../api";

export default function Settings() {
  const navigate = useNavigate();
  const [darkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "organizations" | "sessions" | "labels"
  >("profile");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#3B82F6");

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, orgsData] = await Promise.all([
        getUserProfile(),
        getUserOrganizations(),
      ]);
      setProfile(profileData);
      setUsername(profileData.username);
      setOrganizations(orgsData);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      setMessage({ type: "error", text: "Username cannot be empty" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(username.trim());
      localStorage.setItem("username", username.trim());
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "All password fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to change password",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchOrg = (org: UserOrganization) => {
    setCurrentOrganization({
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerId: 0,
      createdAt: "",
      role: org.role,
    });
    navigate("/");
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (deviceId: string) => {
    if (!confirm("Are you sure you want to revoke this session?")) return;
    try {
      await revokeSession(deviceId);
      setSessions(sessions.filter((s) => s.deviceId !== deviceId));
    } catch (err) {
      alert("Failed to revoke session");
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const loadLabels = async () => {
    setLabelsLoading(true);
    try {
      const data = await getLabels();
      setLabels(data);
    } catch (err) {
      console.error("Failed to load labels:", err);
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleSaveLabel = async () => {
    if (!labelName.trim()) {
      setMessage({ type: "error", text: "Label name is required" });
      return;
    }
    setSaving(true);
    try {
      const data: LabelInput = { name: labelName.trim(), color: labelColor };
      if (editingLabel) {
        await updateLabel(editingLabel.id, data);
      } else {
        await createLabel(data);
      }
      setShowLabelForm(false);
      setEditingLabel(null);
      setLabelName("");
      setLabelColor("#3B82F6");
      loadLabels();
      setMessage({
        type: "success",
        text: `Label ${editingLabel ? "updated" : "created"} successfully`,
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to save label",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm("Are you sure you want to delete this label?")) return;
    try {
      await deleteLabel(labelId);
      setLabels(labels.filter((l) => l.id !== labelId));
      setMessage({ type: "success", text: "Label deleted" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to delete label",
      });
    }
  };

  const openEditLabel = (label: Label) => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color);
    setShowLabelForm(true);
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950 text-slate-100" : "bg-neo-primary"}`}
      >
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-neo-primary"}`}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className={`p-2 border-4 border-black transition-colors ${darkMode ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-neo-secondary hover:bg-neo-accent"}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black uppercase">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 font-bold uppercase border-4 border-black ${
              activeTab === "profile"
                ? darkMode
                  ? "bg-neo-accent text-white"
                  : "bg-black text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-neo-secondary hover:bg-neo-accent text-black"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2 font-bold uppercase border-4 border-black ${
              activeTab === "password"
                ? darkMode
                  ? "bg-neo-accent text-white"
                  : "bg-black text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-neo-secondary hover:bg-neo-accent text-black"
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Password
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
            className={`px-4 py-2 font-bold uppercase border-4 border-black ${
              activeTab === "organizations"
                ? darkMode
                  ? "bg-neo-accent text-white"
                  : "bg-black text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-neo-secondary hover:bg-neo-accent text-black"
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Organizations
          </button>
          <button
            onClick={() => {
              setActiveTab("sessions");
              loadSessions();
            }}
            className={`px-4 py-2 font-bold uppercase border-4 border-black ${
              activeTab === "sessions"
                ? darkMode
                  ? "bg-neo-accent text-white"
                  : "bg-black text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-neo-secondary hover:bg-neo-accent text-black"
            }`}
          >
            <Monitor className="w-4 h-4 inline mr-2" />
            Sessions
          </button>
          <button
            onClick={() => {
              setActiveTab("labels");
              loadLabels();
            }}
            className={`px-4 py-2 font-bold uppercase border-4 border-black ${
              activeTab === "labels"
                ? darkMode
                  ? "bg-neo-accent text-white"
                  : "bg-black text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-neo-secondary hover:bg-neo-accent text-black"
            }`}
          >
            <Tags className="w-4 h-4 inline mr-2" />
            Labels
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 border-4 border-black font-bold ${
              message.type === "success"
                ? darkMode
                  ? "bg-emerald-700 text-slate-50"
                  : "bg-green-500 text-white"
                : darkMode
                  ? "bg-rose-700 text-slate-50"
                  : "bg-red-500 text-white"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div
            className={`border-4 border-black p-6 ${darkMode ? "bg-slate-900 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" : "bg-neo-secondary"}`}
          >
            <h2 className="text-xl font-black uppercase mb-4">User Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block font-bold uppercase mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-2">Role</label>
                <div
                  className={`p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
                >
                  {profile?.role || "USER"}
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-2">
                  Provider
                </label>
                <div
                  className={`p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
                >
                  {profile?.provider || "LOCAL"}
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-2">
                  Member Since
                </label>
                <div
                  className={`p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
                >
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className={`w-full py-3 font-bold uppercase border-4 border-black flex items-center justify-center gap-2 ${darkMode ? "bg-neo-accent text-white hover:bg-rose-500" : "bg-black text-white hover:bg-gray-800"}`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div
            className={`border-4 border-black p-6 ${darkMode ? "bg-slate-900 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" : "bg-neo-secondary"}`}
          >
            <h2 className="text-xl font-black uppercase mb-4">
              Change Password
            </h2>

            {profile?.provider !== "LOCAL" ? (
              <div
                className={`p-4 border-4 border-black font-bold ${darkMode ? "bg-amber-900 text-amber-50" : "bg-yellow-200"}`}
              >
                Password cannot be changed for {profile?.provider} accounts.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className={`w-full py-3 font-bold uppercase border-4 border-black flex items-center justify-center gap-2 ${darkMode ? "bg-neo-accent text-white hover:bg-rose-500" : "bg-black text-white hover:bg-gray-800"}`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Change Password
                </button>
              </div>
            )}
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === "organizations" && (
          <div
            className={`border-4 border-black p-6 ${darkMode ? "bg-slate-900 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" : "bg-neo-secondary"}`}
          >
            <h2 className="text-xl font-black uppercase mb-4">
              Your Organizations
            </h2>

            {organizations.length === 0 ? (
              <div
                className={`p-4 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
              >
                No organizations. Create or join one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`flex items-center justify-between p-4 border-4 border-black ${darkMode ? "bg-slate-800 text-slate-100" : "bg-white"}`}
                  >
                    <div>
                      <div className="font-black uppercase">{org.name}</div>
                      <div
                        className={`text-sm font-bold ${darkMode ? "text-slate-400" : "text-gray-500"}`}
                      >
                        @{org.slug}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-1 text-xs font-bold uppercase ${darkMode ? "bg-slate-100 text-slate-950" : "bg-black text-white"}`}
                      >
                        {org.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSwitchOrg(org)}
                      className={`px-4 py-2 border-4 border-black font-bold uppercase transition-colors ${darkMode ? "bg-slate-100 text-slate-950 hover:bg-slate-200" : "bg-neo-accent hover:bg-black hover:text-white"}`}
                    >
                      Switch
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div
            className={`border-4 border-black p-6 ${darkMode ? "bg-slate-900 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" : "bg-neo-secondary"}`}
          >
            <h2 className="text-xl font-black uppercase mb-4">
              Active Sessions
            </h2>
            <p
              className={`text-sm font-bold mb-4 ${darkMode ? "text-slate-300" : "text-gray-600"}`}
            >
              You can be logged in on up to 5 devices. Oldest sessions are
              automatically removed when limit is exceeded.
            </p>

            {sessionsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-bold">Loading sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div
                className={`p-4 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
              >
                No active sessions
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.deviceId}
                    className={`flex items-center justify-between p-4 border-4 border-black ${darkMode ? "bg-slate-800 text-slate-100" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-3">
                      {session.deviceName.toLowerCase().includes("iphone") ||
                      session.deviceName.toLowerCase().includes("android") ? (
                        <Smartphone className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Monitor className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-bold">
                          {session.deviceName}
                          {session.isCurrentSession && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-sm font-bold flex items-center gap-1 ${darkMode ? "text-slate-300" : "text-gray-500"}`}
                        >
                          <Globe className="w-3 h-3" />
                          {session.ipAddress}
                        </div>
                        <div
                          className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-400"}`}
                        >
                          Last active: {formatDate(session.lastActive)}
                        </div>
                      </div>
                    </div>
                    {!session.isCurrentSession && (
                      <button
                        onClick={() => handleRevokeSession(session.deviceId)}
                        className={`p-2 border-4 border-transparent transition-colors ${darkMode ? "text-rose-400 hover:bg-rose-900/40 hover:border-slate-100" : "text-red-500 hover:bg-red-100 hover:border-black"}`}
                        title="Revoke session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Labels Tab */}
        {activeTab === "labels" && (
          <div
            className={`border-4 border-black p-6 ${darkMode ? "bg-slate-900 text-slate-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" : "bg-neo-secondary"}`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black uppercase">Task Labels</h2>
              <button
                onClick={() => {
                  setShowLabelForm(true);
                  setEditingLabel(null);
                  setLabelName("");
                  setLabelColor("#3B82F6");
                }}
                className={`px-4 py-2 font-bold uppercase border-4 border-black flex items-center gap-2 ${darkMode ? "bg-neo-accent text-white hover:bg-rose-500" : "bg-black text-white hover:bg-gray-800"}`}
              >
                <Plus className="w-4 h-4" />
                Add Label
              </button>
            </div>

            {showLabelForm && (
              <div
                className={`mb-6 p-4 border-4 border-black ${darkMode ? "bg-slate-800 text-slate-100" : "bg-white"}`}
              >
                <h3 className="font-bold uppercase mb-4">
                  {editingLabel ? "Edit" : "New"} Label
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold uppercase mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={labelName}
                      onChange={(e) => setLabelName(e.target.value)}
                      className={`w-full p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-900 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                      placeholder="Label name"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={labelColor}
                        onChange={(e) => setLabelColor(e.target.value)}
                        className="w-12 h-12 border-4 border-black"
                      />
                      <input
                        type="text"
                        value={labelColor}
                        onChange={(e) => setLabelColor(e.target.value)}
                        className={`flex-1 p-3 border-4 border-black font-bold ${darkMode ? "bg-slate-900 text-slate-100 placeholder:text-slate-400" : "bg-white"}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLabel}
                      disabled={saving}
                      className={`px-4 py-2 font-bold uppercase border-4 border-black ${darkMode ? "bg-neo-accent text-white hover:bg-rose-500" : "bg-black text-white hover:bg-gray-800"}`}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowLabelForm(false);
                        setEditingLabel(null);
                      }}
                      className={`px-4 py-2 font-bold uppercase border-4 border-black ${darkMode ? "bg-slate-700 text-slate-100 hover:bg-slate-600" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {labelsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-bold">Loading labels...</span>
              </div>
            ) : labels.length === 0 ? (
              <div
                className={`p-4 border-4 border-black font-bold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-gray-200"}`}
              >
                No labels yet. Create your first label to organize tasks.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className={`flex items-center gap-2 px-3 py-2 border-4 border-black ${darkMode ? "bg-slate-800 text-slate-100" : "bg-white"}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-bold">{label.name}</span>
                    <button
                      onClick={() => openEditLabel(label)}
                      className={`p-1 ${darkMode ? "text-slate-300 hover:text-slate-100" : "text-gray-500 hover:text-black"}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteLabel(label.id)}
                      className={`p-1 ${darkMode ? "text-rose-400 hover:text-rose-300" : "text-red-500 hover:text-red-700"}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
