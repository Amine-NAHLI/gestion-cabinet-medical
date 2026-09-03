import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10 min-h-screen w-full">
      <main className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* LEFT SECTION */}
          <section className="hidden md:flex md:col-span-5 lg:col-span-6 flex-col justify-between rounded-3xl bg-gradient-to-b from-sky-50/70 via-slate-50 to-teal-50/50 p-8 lg:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-teal-100/50 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-sky-100/60 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="space-y-3">
                <h1 className="font-headline-xl text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Your Clinic, <span className="text-sky-600">Smarter.</span>
                </h1>
                <p className="font-body-md text-slate-600 text-sm lg:text-base leading-relaxed max-w-md">
                  Manage patients, appointments and medical records with a simple and secure platform.
                </p>
              </div>
              
              <div className="rounded-2xl overflow-hidden bg-white/80 p-3 lg:p-4 border border-slate-200/70 shadow-sm backdrop-blur-sm">
                <div className="w-full flex items-center justify-center rounded-xl overflow-hidden">
                  <img alt="MediCare Clean Clinic Illustration" className="w-full h-auto max-h-72 object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1WJm7XjOk3aoOUacMFHR1P5-CDhbHXHeBpT5xP0WROcL-5hFIg12gmKFJxkKkNl20f4bFMmwZIYLXsj0WJGKusRk6nxls2ujxSSc5yuyCTMXFEAj4AJxd12rvcOA-qsp4T_0-2uHSoE221prCslQ9ZNXPjtd7rejRCP40NMo6AvW-HbxY6fuuam7a1yLqLOxyQT6uLCDbnhwf9Sbi37NUiWv7qzwpML1Y8iCjb4xjuRJGHoII8hy2aj7fY"/>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-700 mb-2">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <p className="font-headline-sm text-xs lg:text-sm font-semibold text-slate-800 leading-tight">Patient Management</p>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-teal-100/80 flex items-center justify-center text-teal-700 mb-2">
                    <span className="material-symbols-outlined text-xl">calendar_today</span>
                  </div>
                  <p className="font-headline-sm text-xs lg:text-sm font-semibold text-slate-800 leading-tight">Smart Scheduling</p>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-700 mb-2">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <p className="font-headline-sm text-xs lg:text-sm font-semibold text-slate-800 leading-tight">Medical Records</p>
                </div>
              </div>
            </div>
            
            <div className="relative z-10 pt-6 mt-6 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Trusted by healthcare teams</span>
              <span className="inline-flex items-center gap-1.5 text-teal-700">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                Operational
              </span>
            </div>
          </section>

          {/* RIGHT SECTION */}
          <section className="col-span-1 md:col-span-7 lg:col-span-6 flex items-center justify-center">
            <div className="w-full max-w-lg bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <img alt="MediCare Logo" className="w-10 h-10 object-contain rounded-xl shadow-xs" src="https://lh3.googleusercontent.com/aida/AEtjO1Xu20agQgPI7nhBJ2KNa8GxHs9qmmY2gVFpx-XR1V64PMrQkoI7_b_v-xcilB7AeepBrDrgc44aieW_XCEX0ssqt3RFVvXNzkv6CgZp_XycEApmINS90gmaSoq_JoxkTUBruLMN8JGiYCKH32pIV8jtMIV9N7I3I5ObxDPzIDTpkgCj9X4OMNwgQYeo21Qo7ImtT_QNVfvC9yUFJVITMzj7HlM5xIvU9dkprCh_668rAIq0aqeFAykDsZ_w"/>
                  <div>
                    <span className="font-headline-md text-xl font-bold text-slate-900 tracking-tight block">MediCare</span>
                    <p className="text-xs font-medium text-teal-700">Medical Clinic Management System</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
                  <p className="text-sm text-slate-500 mt-1.5 font-normal">Choose your role and sign in to continue.</p>
                </div>

                <LoginForm />
                
              </div>
              
              <div className="mt-8 pt-5 text-center border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Need help accessing your account?
                  <a className="text-sky-600 hover:underline font-medium ml-1" href="#support">Contact your administrator</a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
