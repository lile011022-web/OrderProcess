import { Lock, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../types";
import { changePasswordApi } from "../utils/api";
import { loginWithBackend } from "../utils/auth";
import { roleLabels } from "../utils/permissions";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeUsername, setChangeUsername] = useState("");
  const [changeRole, setChangeRole] = useState<Role>("admin");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const particles = useMemo(() => Array.from({ length: 54 }, (_, index) => ({
    left: `${(index * 37) % 100}%`,
    top: `${(index * 19) % 100}%`,
    delay: `${(index % 9) * 0.42}s`,
  })), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await loginWithBackend(username, password, role);
      navigate(result.redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    setChangeLoading(true);
    setChangeError("");
    setSuccess("");
    try {
      if (newPassword !== confirmPassword) throw new Error("两次输入的新密码不一致");
      const result = await changePasswordApi(changeUsername, changeRole, oldPassword, newPassword);
      setSuccess(result.message);
      setUsername(changeUsername);
      setRole(changeRole);
      setPassword("");
      setChangeOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (changePasswordError) {
      setChangeError(changePasswordError instanceof Error ? changePasswordError.message : "修改密码失败，请稍后重试。");
    } finally {
      setChangeLoading(false);
    }
  }

  return (
    <div className="login-bg relative grid place-items-center px-6">
      {particles.map((particle, index) => <span key={index} className="particle" style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }} />)}
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-cyan-400/10 to-transparent" />
      <div className="relative w-full max-w-[500px] rounded-[32px] border border-white/18 bg-white/10 p-8 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/12 px-4 py-2 text-xs font-black tracking-[0.22em] text-cyan-100">CARD OPS</div>
          <h1 className="text-3xl font-black tracking-tight">球星卡采购接单对账系统</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">采购任务、买手回填、仓库确认与成本核算的一体化前端原型。</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">用户名</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4">
              <UserRound size={19} className="text-cyan-200" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="admin / buyer / warehouse / customer" />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">密码</span>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4">
              <Lock size={19} className="text-cyan-200" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full bg-transparent outline-none" />
            </div>
          </label>
          <div>
            <span className="mb-2 block text-sm font-bold text-slate-200">角色选择</span>
            <div className="grid grid-cols-4 gap-2">
              {(["admin", "buyer", "warehouse", "customer"] as Role[]).map((item) => (
                <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${role === item ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"}`}>
                  {roleLabels[item]}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-2xl bg-rose-500/16 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>}
          {success && <p className="rounded-2xl bg-emerald-400/16 px-4 py-3 text-sm font-bold text-emerald-100">{success}</p>}
          <button disabled={loading} className="h-14 w-full rounded-2xl bg-white text-base font-black text-slate-950 shadow-[0_15px_45px_rgba(45,212,191,0.22)] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "登录中..." : "登录系统"}</button>
        </form>
        <button type="button" onClick={() => {
          setChangeUsername(username);
          setChangeRole(role);
          setChangeOpen((value) => !value);
          setChangeError("");
        }} className="mt-4 h-12 w-full rounded-2xl border border-white/15 bg-white/10 text-sm font-black text-cyan-100 transition hover:bg-white/15">
          修改密码
        </button>
        {changeOpen && (
          <form onSubmit={submitPasswordChange} className="mt-5 space-y-3 rounded-2xl border border-white/15 bg-slate-950/35 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-300">用户名</span>
                <input value={changeUsername} onChange={(e) => setChangeUsername(e.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm outline-none placeholder:text-slate-500" placeholder="请输入用户名" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-300">角色</span>
                <select value={changeRole} onChange={(e) => setChangeRole(e.target.value as Role)} className="h-11 w-full rounded-xl border border-white/15 bg-slate-900 px-3 text-sm font-bold outline-none">
                  {(["admin", "buyer", "warehouse", "customer"] as Role[]).map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
                </select>
              </label>
            </div>
            <input value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} type="password" className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm outline-none" placeholder="旧密码" />
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm outline-none" placeholder="新密码：至少 10 位，含大小写、数字和特殊符号" />
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm outline-none" placeholder="再次输入新密码" />
            {changeError && <p className="rounded-xl bg-rose-500/16 px-3 py-2 text-xs font-bold text-rose-100">{changeError}</p>}
            <button disabled={changeLoading} className="h-11 w-full rounded-xl bg-cyan-200 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{changeLoading ? "提交中..." : "确认修改密码"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
