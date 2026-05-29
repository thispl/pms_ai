// apps/pms_ai/pms_ai/public/js/pms_workspace.js

frappe.pages['pms-dashboard'].on_page_load = function(wrapper) {
	
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'PMS',
		single_column: true
	});
	$(page.body).toggleClass("full-width", true);
	
	// REMOVE DEFAULT UNDEFINED BREADCRUMB
	$(wrapper).find('.page-head .breadcrumb-container').html(`
		<h3 class="pms-page-title">PMS</h3>
	`);

	$(page.body).html(`

	<div class="pms-ultra-wrapper">

		<!-- BACKGROUND -->
		<div class="pms-bg-circle pms-bg-1"></div>
		<div class="pms-bg-circle pms-bg-2"></div>
		<div class="pms-bg-circle pms-bg-3"></div>

		<div class="pms-hero-section">

			<!-- LEFT SIDE -->
			<div class="pms-left">

				<div class="pms-top-header">

					<img class="pms-company-logo"
						src="/files/galfar-logo.png" />

					<div class="pms-badge">
						⭐ WELCOME TO AI-POWERED PERFORMANCE MANAGEMENT SYSTEM
					</div>

				</div>

				<!-- SLIDER -->
				<div class="pms-slider-container">

					<div class="pms-slides">

						<!-- SLIDE 1 -->
						<div class="pms-slide active">

							<div class="pms-slide-content">

								<div class="pms-slide-tag">
									SMART PERFORMANCE
								</div>

								<h1 class="pms-main-title">
									TIME OF <span>ASSESSMENT</span>
								</h1>

								<div class="pms-line"></div>

								<p class="pms-desc">
									Empower employee growth through intelligent
									performance appraisals, KPI tracking and
									smart evaluation workflows.
								</p>

								<div class="pms-mini-cards">
									<div class="pms-mini-card">🎯 KPI Tracking</div>
									<div class="pms-mini-card">📈 Analytics</div>
									<div class="pms-mini-card">🏆 Smart Reviews</div>
								</div>

							</div>

							<div class="pms-slide-image-wrap">
								<img class="pms-slide-image" src="/files/image (1).png" />
							</div>

						</div>

						<!-- SLIDE 2 -->
						<div class="pms-slide">

							<div class="pms-slide-content">

								<div class="pms-slide-tag">
									AI ANALYTICS
								</div>

								<h1 class="pms-main-title">
									SMART <span>ANALYTICS</span>
								</h1>

								<div class="pms-line"></div>

								<p class="pms-desc">
									AI-powered insights for productivity,
									performance trends and employee growth.
								</p>

								<div class="pms-mini-cards">
									<div class="pms-mini-card">⚡ AI Engine</div>
									<div class="pms-mini-card">📊 Reports</div>
									<div class="pms-mini-card">🚀 Insights</div>
								</div>

							</div>

							<div class="pms-slide-image-wrap">
								<img class="pms-slide-image" src="/files/Slider-1.webp" />
							</div>

						</div>

						<!-- SLIDE 3 -->
						<div class="pms-slide">

							<div class="pms-slide-content">

								<div class="pms-slide-tag">
									PERFORMANCE EXCELLENCE
								</div>

								<h1 class="pms-main-title">
									PERFORMANCE <span>EXCELLENCE</span>
								</h1>

								<div class="pms-line"></div>

								<p class="pms-desc">
									Drive continuous improvement using
									structured appraisal workflows and KRAs.
								</p>

								<div class="pms-mini-cards">
									<div class="pms-mini-card">🏢 KRAs</div>
									<div class="pms-mini-card">⭐ Appraisals</div>
									<div class="pms-mini-card">🎖 Reviews</div>
								</div>

							</div>

							<div class="pms-slide-image-wrap">
								<img class="pms-slide-image" src="/files/header image.png" />
							</div>

						</div>
						<div class="pms-slide">

							<div class="pms-slide-content">

								<div class="pms-slide-tag">
									TALENT DEVELOPMENT
								</div>

								<h1 class="pms-main-title">
									TALENT <span>DEVELOPMENT</span>
								</h1>

								<div class="pms-line"></div>

								<p class="pms-desc">
									LEARNING & GROWTH Enable career progression through competency development, training insights, and personalized growth plans.
								</p>

								<div class="pms-mini-cards">
									<div class="pms-mini-card">🎓 Skill Development</div>
									<div class="pms-mini-card">⭐ Learning Insights</div>
									<div class="pms-mini-card">🌱 Career Growth</div>
								</div>

							</div>

							<div class="pms-slide-image-wrap">
								<img class="pms-slide-image" src="/files/Talent Development.jpg" />
							</div>

						</div>
						<div class="pms-slide">

							<div class="pms-slide-content">

								<div class="pms-slide-tag">
									AI-POWERED PERFORMANCE
								</div>

								<h1 class="pms-main-title">
									AI-POWERED <span>PERFORMANCE</span>
								</h1>

								<div class="pms-line"></div>

								<p class="pms-desc">
									INTELLIGENT DECISION MAKING Transform performance management with AI-driven analytics, predictive insights, and smarter evaluation processes.
								</p>

								<div class="pms-mini-cards">
									<div class="pms-mini-card">🤖 AI Recommendations</div>
									<div class="pms-mini-card">📈 Predictive Analytics</div>
									<div class="pms-mini-card">⚡ Intelligent Insights</div>
								</div>

							</div>

							<div class="pms-slide-image-wrap">
								<img class="pms-slide-image" src="/files/AI-POWERED PERFORMANCE.jpg" />
							</div>

						</div>
					</div>

					<!-- DOTS -->
					<div class="pms-slider-dots">
						<span class="pms-dot active"></span>
						<span class="pms-dot"></span>
						<span class="pms-dot"></span>
						<span class="pms-dot"></span>
						<span class="pms-dot"></span>
					</div>

				</div>

			</div>

			<!-- RIGHT SIDE -->
			<div class="pms-right">

				<div class="pms-glass-card">

					<div class="pms-star-wrap">
						<div class="pms-star-ring"></div>
						<div class="pms-star"><img  src="/files/automation_ai_atom.gif" /></div>
					</div>

					<div class="pms-appraisal-title">
						Performance Appraisal
					</div>

					<div class="pms-subtitle">
						Manage employee reviews, assessments,
						KRAs and appraisal workflows.
					</div>

					<button class="pms-main-btn">
						<div class="pms-btn-inner">
							<div class="pms-btn-small">CLICK</div>
							<div class="pms-btn-big">HERE</div>
						</div>
					</button>

				</div>

			</div>

		</div>

	</div>

	`);

	// =========================================
	// ROUTE
	// =========================================

	$('.pms-main-btn').on('click', function () {
    if (frappe.user.has_role("Appraisal Assessor") || frappe.user.has_role("Unit Head")) {
        frappe.set_route('', 'performance-appraisal').then(() => {
            window.location.reload();
        });
    } else {
        frappe.db.get_list('Appraisal', {
            filters: {
                custom_user_id: frappe.session.user
            },
            fields: ['name'],
            order_by: 'creation desc',
            limit: 1
        }).then(r => {
			console.log(r)
            if (r && r.length > 0) {
                frappe.set_route('Form', 'Appraisal', r[0].name);
            } else {
                frappe.set_route('list', 'Appraisal');
            }
        });
    }
});
	
	// =========================================
	// SLIDER
	// =========================================

	let currentSlide = 0;

	const slides = document.querySelectorAll('.pms-slide');
	const dots = document.querySelectorAll('.pms-dot');

	function showSlide(index){
		slides.forEach((slide) => slide.classList.remove('active'));
		dots.forEach((dot) => dot.classList.remove('active'));
		slides[index].classList.add('active');
		dots[index].classList.add('active');
	}

	function nextSlide(){
		currentSlide++;
		if(currentSlide >= slides.length) currentSlide = 0;
		showSlide(currentSlide);
	}

	setInterval(nextSlide, 4500);

	dots.forEach((dot, index) => {
		dot.addEventListener('click', function(){
			currentSlide = index;
			showSlide(currentSlide);
		});
	});

	// REMOVE OLD STYLE
	$('#pms-ultra-style').remove();

	// =========================================
	// STYLE
	// =========================================

	$('head').append(`

	<style id="pms-ultra-style">

	/* =========================================
	KILL ALL SCROLL — make page fit viewport
	========================================= */

	html, body {
		height: 100%;
		overflow: hidden !important;
	}

	.page-body,
	.layout-main,
	.layout-main-section-wrapper,
	.layout-main-section,
	.container,
	.page-content,
	[data-page-route="pms-dashboard"] {
		height: 100% !important;
		overflow: hidden !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	.layout-main-section {
		background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 35%, #ffffff 100%) !important;
		padding: 0 !important;
		overflow: hidden !important;
		height: 100% !important;
	}

	.page-body {
		background: transparent !important;
	}

	/* =========================================
	WRAPPER — fills available space exactly
	========================================= */

	.pms-ultra-wrapper {
		/* subtract Frappe's navbar (~50px) + page-head (~48px) */
		height: calc(100vh - 100px);
		width: 100%;
		padding: clamp(12px, 2vh, 30px) clamp(16px, 3vw, 50px);
		position: relative;
		overflow: hidden;
		font-family: 'Inter', sans-serif;
		color: #1e293b;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	/* =========================================
	BACKGROUND GLOW
	========================================= */

	.pms-bg-circle {
		position: absolute;
		border-radius: 50%;
		filter: blur(90px);
		opacity: .22;
		z-index: 0;
		pointer-events: none;
	}

	.pms-bg-1 {
		width: 400px; height: 400px;
		background: #93c5fd;
		top: -100px; left: -80px;
	}

	.pms-bg-2 {
		width: 340px; height: 340px;
		background: #c4b5fd;
		right: -100px; top: 60px;
	}

	.pms-bg-3 {
		width: 300px; height: 300px;
		background: #67e8f9;
		bottom: -100px; left: 40%;
	}

	/* =========================================
	HERO SECTION — fills the wrapper
	========================================= */

	.pms-hero-section {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		justify-content: space-between;
		gap: clamp(16px, 2.5vw, 50px);
		flex: 1;               /* fill wrapper height */
		min-height: 0;         /* allow flex shrink */
		width: 100%;
		box-sizing: border-box;
	}

	/* =========================================
	LEFT COLUMN
	========================================= */

	.pms-left {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	/* =========================================
	TOP HEADER
	========================================= */

	.pms-top-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: clamp(8px, 1.5vh, 20px);
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.pms-company-logo {
		width: clamp(100px, 9vw, 130px);
		height: auto;
		object-fit: contain;
		filter: drop-shadow(0 8px 16px rgba(0,0,0,.08));
	}

	.pms-badge {
		display: inline-flex;
		align-items: center;
		padding: 8px 18px;
		border-radius: 999px;
		background: rgba(255,255,255,.88);
		border: 1px solid rgba(255,255,255,.7);
		font-size: clamp(20px, 1vw, 15px);
		font-weight: 800;
		letter-spacing: 1px;
		color: #2563eb;
		box-shadow: 0 6px 20px rgba(37,99,235,.12);
		align-self: flex-start;
	}

	/* =========================================
	SLIDER CONTAINER — flex-grow to fill height
	========================================= */

	.pms-slider-container {
		flex: 1;
		min-height: 0;           /* crucial — allow shrink */
		position: relative;
		width: 100%;
		background: rgba(255,255,255,.72);
		backdrop-filter: blur(18px);
		border: 1px solid rgba(255,255,255,.65);
		border-radius: 32px;
		padding: clamp(20px, 3vh, 45px) clamp(20px, 3vw, 50px) clamp(40px, 5vh, 70px);
		box-shadow:
			0 20px 50px rgba(15,23,42,.08),
			inset 0 1px 0 rgba(255,255,255,.9);
		overflow: hidden;
		box-sizing: border-box;
	}

	.pms-slider-container::before {
		content: "";
		position: absolute;
		top: -80px; right: -80px;
		width: 220px; height: 220px;
		border-radius: 50%;
		background: rgba(96,165,250,.15);
		pointer-events: none;
	}

	.pms-slider-container::after {
		content: "";
		position: absolute;
		bottom: -60px; left: -60px;
		width: 200px; height: 200px;
		border-radius: 50%;
		background: rgba(192,132,252,.15);
		pointer-events: none;
	}

	/* =========================================
	SLIDES WRAPPER
	========================================= */

	.pms-slides {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
	}

	/* =========================================
	INDIVIDUAL SLIDE
	========================================= */

	.pms-slide {
		position: absolute;
		inset: 0;
		opacity: 0;
		transform: translateX(60px) scale(.96);
		transition: all .8s ease;
		pointer-events: none;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: clamp(16px, 2.5vw, 40px);
	}

	.pms-slide.active {
		opacity: 1;
		transform: translateX(0) scale(1);
		pointer-events: auto;
	}

	/* =========================================
	SLIDE TEXT CONTENT
	========================================= */

	.pms-slide-content {
		flex: 0 0 52%;
		max-width: 52%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		z-index: 2;
	}

	.pms-slide-tag {
		display: inline-block;
		align-self: flex-start;
		padding: 7px 16px;
		border-radius: 999px;
		background: linear-gradient(135deg, #2563eb, #7c3aed);
		color: #fff;
		font-size: clamp(10px, .85vw, 13px);
		font-weight: 800;
		letter-spacing: 1px;
		margin-bottom: clamp(10px, 1.5vh, 18px);
		box-shadow: 0 8px 20px rgba(124,58,237,.25);
	}

	.pms-main-title {
		font-size: clamp(28px, 4vw, 56px);
		line-height: 1.05;
		font-weight: 900;
		letter-spacing: -1.5px;
		margin: 0 0 8px;
		color: #0f172a;
	}

	.pms-main-title span {
		background: linear-gradient(135deg, #2563eb, #7c3aed, #06b6d4);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.pms-line {
		width: clamp(120px, 14vw, 200px);
		height: 5px;
		border-radius: 30px;
		margin: clamp(10px, 1.5vh, 20px) 0;
		background: linear-gradient(90deg, #22c55e, #eab308, #ef4444, #8b5cf6);
		flex-shrink: 0;
	}

	.pms-desc {
		font-size: clamp(13px, 1.1vw, 16px);
		line-height: 1.75;
		color: #475569;
		max-width: 480px;
		margin-bottom: clamp(12px, 2vh, 24px);
		font-weight: 500;
	}

	/* =========================================
	MINI CARDS
	========================================= */

	.pms-mini-cards {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.pms-mini-card {
		padding: 10px 14px;
		border-radius: 14px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		box-shadow: 0 8px 20px rgba(15,23,42,.05);
		font-size: clamp(11px, .9vw, 13px);
		font-weight: 700;
		color: #1e293b;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 42px;
		transition: all .35s ease;
	}

	.pms-mini-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 16px 28px rgba(59,130,246,.12);
	}

	/* =========================================
	SLIDE IMAGE WRAP
	========================================= */

	.pms-slide-image-wrap {
		flex: 0 0 48%;
		max-width: 48%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.pms-slide-image-wrap::before {
		content: "";
		position: absolute;
		width: 300px; height: 300px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(96,165,250,.22), transparent 70%);
		animation: pulseGlow 4s infinite ease-in-out;
		pointer-events: none;
	}

	.pms-slide-image {
		width: 100%;
		max-width: clamp(160px, 22vw, 360px);
		position: relative;
		z-index: 2;
		object-fit: contain;
		filter: drop-shadow(0 24px 36px rgba(37,99,235,.18));
		animation: floatImage 5s ease-in-out infinite;
	}

	/* =========================================
	SLIDER DOTS
	========================================= */

	.pms-slider-dots {
		position: absolute;
		left: clamp(20px, 3vw, 50px);
		bottom: clamp(12px, 1.5vh, 24px);
		display: flex;
		align-items: center;
		gap: 10px;
		z-index: 5;
	}

	.pms-dot {
		width: 12px; height: 12px;
		border-radius: 50%;
		background: #cbd5e1;
		cursor: pointer;
		transition: all .35s ease;
	}

	.pms-dot.active {
		width: 36px;
		border-radius: 30px;
		background: linear-gradient(135deg, #3b82f6, #a855f7);
		box-shadow: 0 0 14px rgba(139,92,246,.35);
	}

	/* =========================================
	RIGHT COLUMN
	========================================= */

	.pms-right {
		width: clamp(260px, 24vw, 380px);
		flex-shrink: 0;
		display: flex;
		align-items: stretch;
		justify-content: center;
	}

	/* =========================================
	GLASS CARD — fills full right column height
	========================================= */

	.pms-glass-card {
		width: 100%;
		padding: clamp(20px, 3vh, 40px) clamp(16px, 2.5vw, 32px);
		border-radius: 32px;
		background: rgba(255,255,255,.78);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255,255,255,.75);
		box-shadow:
			0 20px 50px rgba(15,23,42,.10),
			inset 0 1px 0 rgba(255,255,255,.9);
		text-align: center;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	/* =========================================
	STAR
	========================================= */

	.pms-star-wrap {
		position: relative;
		width: clamp(70px, 8vw, 110px);
		height: clamp(70px, 8vw, 110px);
		margin: 0 auto clamp(12px, 2vh, 22px);
		flex-shrink: 0;
	}

	.pms-star-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px dashed rgba(37,99,235,.35);
		animation: spin 18s linear infinite;
	}

	.pms-star {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(36px, 4.5vw, 54px);
	}
		.pms-star img {
    width: 100%;
    height: 100%;
    border-radius: 50%;         
}

	/* =========================================
	CARD TEXT
	========================================= */

	.pms-appraisal-title {
		font-size: clamp(20px, 2.2vw, 30px);
		font-weight: 900;
		line-height: 1.2;
		margin-bottom: clamp(8px, 1.2vh, 14px);
		color: #0f172a;
	}

	.pms-subtitle {
		font-size: clamp(12px, 1vw, 15px);
		line-height: 1.75;
		color: #475569;
		margin-bottom: clamp(16px, 2.5vh, 32px);
	}

	/* =========================================
	BUTTON
	========================================= */

	.pms-main-btn {
		width: clamp(130px, 14vw, 190px);
		height: clamp(130px, 14vw, 190px);
		border-radius: 50%;
		border: none;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
		background: radial-gradient(circle at top, #fb7185, #ef4444, #b91c1c);
		box-shadow:
			inset 0 10px 18px rgba(255,255,255,.35),
			0 22px 40px rgba(239,68,68,.30);
		transition: all .35s ease;
	}

	.pms-main-btn:hover {
		transform: scale(1.08);
		box-shadow:
			inset 0 10px 18px rgba(255,255,255,.35),
			0 30px 50px rgba(239,68,68,.40);
	}

	.pms-main-btn::before {
		content: "";
		position: absolute;
		top: 18px; left: 24px;
		width: 70%; height: 28%;
		border-radius: 50%;
		background: rgba(255,255,255,.20);
		filter: blur(3px);
	}

	.pms-btn-inner {
		position: relative;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.pms-btn-small {
		font-size: clamp(14px, 1.4vw, 20px);
		font-weight: 700;
		letter-spacing: 3px;
		color: #ffe2e2;
	}

	.pms-btn-big {
		font-size: clamp(30px, 3.5vw, 48px);
		font-weight: 900;
		letter-spacing: 3px;
		color: #ffffff;
		line-height: 1;
	}

	/* =========================================
	PAGE TITLE (breadcrumb area)
	========================================= */

	.pms-page-title {
		font-size: 20px;
		font-weight: 800;
		color: #2563eb;
		margin: 0;
		padding: 8px 0;
	}

	/* =========================================
	ANIMATIONS
	========================================= */

	@keyframes floatImage {
		0%   { transform: translateY(0px); }
		50%  { transform: translateY(-12px); }
		100% { transform: translateY(0px); }
	}

	@keyframes pulseGlow {
		0%   { transform: scale(1);    opacity: .5; }
		50%  { transform: scale(1.08); opacity: .8; }
		100% { transform: scale(1);    opacity: .5; }
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	/* =========================================
	RESPONSIVE — tablet 1024px
	========================================= */

	@media (max-width: 1024px) {

		html, body {
			overflow: auto !important;
		}

		.pms-ultra-wrapper {
			height: auto;
			min-height: 100vh;
			overflow: visible;
		}

		.pms-hero-section {
			flex-direction: column;
			align-items: stretch;
			gap: 28px;
		}

		.pms-right {
			width: 100%;
		}

		.pms-glass-card {
			min-height: auto;
			padding: 36px 28px;
		}

		.pms-slide {
			flex-direction: column;
			text-align: center;
			gap: 20px;
		}

		.pms-slide-content {
			flex: 0 0 auto;
			max-width: 100%;
			align-items: center;
		}

		.pms-slide-image-wrap {
			flex: 0 0 auto;
			max-width: 100%;
		}

		.pms-desc {
			max-width: 100%;
		}

		.pms-mini-cards {
			justify-content: center;
		}

		.pms-slider-dots {
			left: 50%;
			transform: translateX(-50%);
		}

		.pms-slide-tag,
		.pms-line,
		.pms-badge {
			align-self: center;
		}
			
	}

	/* =========================================
	RESPONSIVE — mobile 640px
	========================================= */

	@media (max-width: 640px) {

		.pms-ultra-wrapper {
			padding: 20px 14px;
		}

		.pms-slider-container {
			padding: 24px 16px 60px;
		}

		.pms-slide-image {
			max-width: 220px;
		}

		.pms-mini-card {
			width: 100%;
		}
	}

	</style>

	`);

};