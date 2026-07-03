import { Lock, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../types";
import { loginWithMockAccount } from "../utils/auth";
import { roleLabels } from "../utils/permissions";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [role, setRole] = useState<Role>("admin");
  const [error, setError] = useState("");
  const particles = useMemo(() => Array.from({ length: 54 }, (_, index) => ({
    left: `${(index * 37) % 100}%`,
    top: `${(index * 19) % 100}%`,
    delay: `${(index % 9) * 0.42}s`,
  })), []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = loginWithMockAccount(username, password, role);
    if (!result) {
      setError("账号、密码或角色不匹配，请检查后再登录。");
      return;
    }
    navigate(result.redirectTo, { replace: true });
  }

  return (
    <div className="login-bg relative grid place-items-center px-6">
      {particles.map((particle, index) => <span key={index} className="particle" style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }} />)}
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-cyan-400/10 to-transparent" />
      <form onSubmit={submit} className="relative w-full max-w-[500px] rounded-[32px] border border-white/18 bg-white/10 p-8 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/12 px-4 py-2 text-xs font-black tracking-[0.22em] text-cyan-100">CARD OPS</div>
          <h1 className="text-3xl font-black tracking-tight">球星卡采购接单对账系统</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">采购任务、买手回填、仓库确认与成本核算的一体化前端原型。</p>
        </div>
        <div className="space-y-4">
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
        </div>
        {error && <p className="mt-4 rounded-2xl bg-rose-500/16 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>}
        <button className="mt-6 h-14 w-full rounded-2xl bg-white text-base font-black text-slate-950 shadow-[0_15px_45px_rgba(45,212,191,0.22)]">登录系统</button>
        <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-400">
          <span>admin / 123456</span>
          <span>buyer / 123456</span>
          <span>warehouse / 123456</span>
          <span>customer / 123456</span>
        </div>
      </form>
    </div>
  );
}
