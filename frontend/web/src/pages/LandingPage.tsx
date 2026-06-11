import { Link } from 'react-router-dom'
import linkerLogo from '@/statics/linker_bi_logo.png'

export function LandingPage() {
  return (
    <div className="bg-background font-sans text-primary overflow-x-hidden selection:bg-accent selection:text-primary">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] border-b border-border/20"
        style={{ background: 'rgba(255,251,235,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <img src={linkerLogo} alt="Linker" className="h-6 object-contain" />
          </div>


          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm font-black px-6 py-2.5 bg-primary text-white rounded-xl shadow-xl hover:bg-black transition-all transform hover:-translate-y-0.5">
              로그인
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-background to-orange-50 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* Decorative blobs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent/30 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-10 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black uppercase tracking-widest mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              The Future of Sourcing
            </div>

            <h1 className="text-6xl md:text-8xl font-black leading-[1.05] tracking-tighter mb-10">
              검증된 인력,<br />
              <span style={{
                background: 'linear-gradient(135deg, #451A03 0%, #B45309 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                프로젝트 성공
              </span>
            </h1>

            <p className="text-2xl md:text-3xl text-primary/70 font-black mb-12 leading-relaxed max-w-xl">
              인력 소싱 및 관리 플랫폼, Linker
            </p>

          </div>

          {/* Floating Dashboard Mockup */}
          <div className="hidden lg:block relative animate-float scale-110">
            <div className="relative z-20 p-10 rounded-[56px] shadow-[0_50px_120px_-20px_rgba(69,26,3,0.25)]"
              style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-primary/10 rounded-full" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary/20" />
                    <div className="w-9 h-9 rounded-full bg-primary/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="h-36 bg-secondary/5 rounded-[28px] border border-secondary/20 flex flex-col items-center justify-center gap-2">
                    <div className="text-3xl font-black text-secondary">98%</div>
                    <div className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">Match Score</div>
                  </div>
                  <div className="h-36 bg-primary/5 rounded-[28px] border border-primary/20 flex flex-col items-center justify-center gap-2">
                    <div className="text-3xl font-black text-primary">12+</div>
                    <div className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">Projects</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {['w-full', 'w-4/5', 'w-2/3'].map((w, i) => (
                    <div key={i} className={`h-4 bg-primary/5 rounded-full ${w}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/30 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-secondary/20 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              검증된 데이터가 만드는<br />인사이트의 차이
            </h2>
            <p className="text-lg text-primary/60 font-medium">
              Linker는 불필요한 서류 작업을 줄이고 실제 퍼포먼스에 집중합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🧠',
                title: 'AI 정합성 분석',
                desc: '전문가의 이력서와 프로젝트 수행 이력을 AI가 분석하여, 해당 프로젝트에서의 실제 역할 비중과 기여도를 수치화합니다.',
              },
              {
                icon: '🛡️',
                title: '프로젝트 인증제',
                desc: "수행 완료된 프로젝트는 해당 프로젝트의 PM 혹은 발주 담당자의 인증을 통해 'Verified' 마크가 부여되어 신뢰를 보장합니다.",
              },
              {
                icon: '⚡',
                title: '다이렉트 소싱',
                desc: '복잡한 유통 단계 없이 필요한 전문 인력을 직접 검색하고, 매칭 스코어 기반으로 즉시 제안을 보낼 수 있습니다.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-10 rounded-[40px] bg-surface border border-border/40 transition-all duration-300 hover:-translate-y-3 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(69,26,3,0.15)]"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">{icon}</div>
                <h3 className="text-xl font-black mb-4">{title}</h3>
                <p className="text-sm text-primary/60 leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-based Sections */}
      <section id="business" className="py-20 bg-primary text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Business Side */}
          <div className="space-y-10 lg:border-r lg:border-white/10 lg:pr-20">
            <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">
              For Business
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              프로젝트 성공을 위한<br />최적의 퍼즐 조각을 찾으세요
            </h2>
            <ul className="space-y-6">
              {[
                { title: '정교한 기술 필터링', desc: 'AA, TA, DA 등 현장 중심 직무별 상세 필터' },
                { title: '인력 공급사 통합 관리', desc: '여러 파트너사의 인력을 한 곳에서 비교 및 소싱' },
                { title: '실시간 충원 현황판', desc: '프로젝트별 인력 확보 상태 실시간 모니터링' },
              ].map(({ title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-bold mb-1">{title}</div>
                    <div className="text-sm text-white/60">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              to="/auth/register"
              className="inline-block px-8 py-4 bg-secondary text-white rounded-xl font-black hover:bg-amber-600 transition-all"
            >
              비즈니스 계정 가입
            </Link>
          </div>

          {/* Expert Side */}
          <div id="expert" className="space-y-10">
            <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">
              For Experts
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              당신의 기술력은<br />데이터로 증명됩니다
            </h2>
            <ul className="space-y-6">
              {[
                { title: 'AI 커리어 디지털 전환', desc: 'PDF 이력서 업로드만으로 정교한 디지털 프로필 생성' },
                { title: '매칭 가이드라인 설정', desc: '수행 가능 최소 단가 및 선호 지역 기반의 맞춤 제안' },
                { title: '통합 이력 증명서 발급', desc: '검증된 모든 프로젝트 이력을 하나의 리포트로 추출' },
              ].map(({ title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-accent text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-bold mb-1">{title}</div>
                    <div className="text-sm text-white/60">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              to="/auth/register"
              className="inline-block px-8 py-4 bg-accent text-primary rounded-xl font-black hover:bg-yellow-300 transition-all"
            >
              전문가 프로필 등록
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-surface border-t border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg font-black">L</span>
              <span className="text-lg font-black tracking-tighter opacity-40">Linker.</span>
            </div>
            <div className="flex gap-10 text-xs font-bold text-primary/40 uppercase tracking-widest">
              <a href="#" className="hover:text-primary transition-colors">이용약관</a>
              <a href="#" className="hover:text-primary transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-primary transition-colors">고객센터</a>
            </div>
            <div className="text-[10px] text-primary/30 font-medium">
              © 2026 Linker Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
