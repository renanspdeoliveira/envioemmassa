import{c as k,m as W,n as T,r as o,j as e,o as m,S as L,a as A,I as f,E as N,b as H,s as h}from"./index-CUrNjbeT.js";/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=k("LockKeyhole",[["circle",{cx:"12",cy:"16",r:"1",key:"1au0dj"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2",key:"6s8ecr"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3",key:"1pqi11"}]]);/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=k("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);function je(){var u,x;const{session:S,loading:z,enabled:I}=W(),R=((x=(u=T().state)==null?void 0:u.from)==null?void 0:x.pathname)||"/",[i,C]=o.useState(""),[c,E]=o.useState(""),[s,n]=o.useState(!1),[p,a]=o.useState(""),[g,r]=o.useState("");async function B(t){t.preventDefault(),n(!0),a(""),r("");const{error:b}=await h.auth.signInWithPassword({email:i,password:c});b&&a(b.message),n(!1)}async function F(){if(!i.trim()){a("Informe seu email para recuperar a senha."),r("");return}n(!0),a(""),r("");const{error:t}=await h.auth.resetPasswordForEmail(i.trim());t?a(t.message):r("Se o email existir, enviaremos as instrucoes de recuperacao."),n(!1)}return I?z?e.jsx(L,{size:24}):S?e.jsx(m,{to:R,replace:!0}):e.jsxs("div",{style:P,children:[e.jsx("style",{children:`
        @keyframes loginFadeOut {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
        }

        @keyframes loginReveal {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes glowReveal {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes astronautFloat {
          0% {
            transform: translate3d(0, 0, 0) rotate(-4deg);
          }
          50% {
            transform: translate3d(0, -16px, 0) rotate(-1deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(-4deg);
          }
        }

        .login-panel input:-webkit-autofill,
        .login-panel input:-webkit-autofill:hover,
        .login-panel input:-webkit-autofill:focus,
        .login-panel input:-webkit-autofill:active {
          -webkit-text-fill-color: #f4fbff;
          caret-color: #f4fbff;
          -webkit-box-shadow: 0 0 0 1000px rgba(18, 25, 36, 0.96) inset;
          box-shadow: 0 0 0 1000px rgba(18, 25, 36, 0.96) inset;
          transition: background-color 9999s ease-out 0s;
          border-radius: 0;
        }

        @media (max-width: 980px) {
          .login-split-layout {
            grid-template-columns: 1fr;
            gap: 18px;
            max-width: 540px;
          }

          .login-intro-column {
            min-height: auto;
            padding: 0;
            gap: 20px;
          }

          .login-panel {
            justify-self: stretch;
            max-width: none;
          }

          .login-astronaut {
            display: none;
          }
        }
      `}),e.jsx("div",{style:K}),e.jsx("div",{style:U}),e.jsx("div",{style:me}),e.jsx("div",{style:fe}),e.jsx("div",{style:he}),e.jsxs("div",{className:"login-split-layout",style:D,children:[e.jsxs("section",{className:"login-intro-column",style:G,children:[e.jsx("div",{className:"login-astronaut",style:ee,children:e.jsxs("div",{style:te,children:[e.jsx("div",{style:ae}),e.jsx("div",{style:oe}),e.jsx("div",{style:ie}),e.jsx("img",{src:"./astronauta.png",alt:"Mascote Futuranet flutuando",style:ne})]})}),e.jsxs("div",{style:O,children:[e.jsx("div",{style:J,children:"Acesso Seguro"}),e.jsxs("div",{style:Q,children:[e.jsxs("h1",{style:X,children:["Bem-vindo",e.jsx("br",{}),"de volta."]}),e.jsx("p",{style:_,children:"Acesse o painel de monitoramento da FuturaNet com rapidez, clareza e tudo o que sua operacao precisa na abertura do dia."})]}),e.jsxs("div",{style:$,children:[e.jsxs("div",{style:l,children:[e.jsx("span",{style:d}),"Monitoramento centralizado da rede"]}),e.jsxs("div",{style:l,children:[e.jsx("span",{style:d}),"Acompanhamento rapido de clientes e ONUs"]}),e.jsxs("div",{style:l,children:[e.jsx("span",{style:d}),"Comunicacao e operacao em um unico painel"]})]})]}),e.jsx("div",{style:be,children:"Copyright © Todos os direitos reservados à FuturaNet 2026"})]}),e.jsxs(A,{className:"login-panel",style:V,children:[e.jsx("div",{style:Y}),e.jsxs("div",{style:Z,children:[e.jsx("div",{style:re,children:e.jsx("img",{src:"./Logo-Futuranet.png",alt:"Logo Futuranet",style:se})}),e.jsx("div",{style:le,children:"Entre em sua conta"}),e.jsx("div",{style:de,children:"Use seu email corporativo para continuar."})]}),e.jsxs("form",{onSubmit:B,style:ce,children:[e.jsxs("label",{style:y,children:[e.jsx("span",{style:v,children:"Email"}),e.jsxs("div",{style:j,children:[e.jsx(q,{size:16,color:"var(--accent-blue-text)"}),e.jsx(f,{type:"email",value:i,onChange:t=>C(t.target.value),placeholder:"Seu email@empresa.com",autoComplete:"email",required:!0,style:w})]})]}),e.jsxs("label",{style:y,children:[e.jsx("span",{style:v,children:"Senha"}),e.jsxs("div",{style:j,children:[e.jsx(M,{size:16,color:"var(--accent-blue-text)"}),e.jsx(f,{type:"password",value:c,onChange:t=>E(t.target.value),placeholder:"Sua senha",autoComplete:"current-password",required:!0,style:w})]})]}),e.jsx("div",{style:pe,children:e.jsx("button",{type:"button",onClick:F,disabled:s,style:ge,children:"Esqueceu a senha?"})}),p&&e.jsx(N,{message:p}),g&&e.jsx("div",{style:ue,children:g}),e.jsx(H,{type:"submit",variant:"primary",disabled:s,style:xe,children:s?"Entrando...":"Entrar"})]})]})]})]}):e.jsx(m,{to:"/",replace:!0})}const P={minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 32px",background:"radial-gradient(circle at top, #17263f 0%, #101723 40%, #0b1017 100%)",position:"relative",overflow:"hidden"},D={width:"100%",maxWidth:1220,display:"grid",gridTemplateColumns:"minmax(0, 1.18fr) minmax(390px, 0.82fr)",alignItems:"stretch",gap:28,position:"relative",zIndex:1},G={minHeight:592,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"18px 8px 8px 4px",position:"relative",zIndex:2,overflow:"visible",animation:"loginReveal 720ms cubic-bezier(.2,.8,.2,1) both"},O={maxWidth:520,position:"relative",zIndex:2},K={position:"absolute",inset:0,background:"radial-gradient(circle at 50% 16%, rgba(18, 32, 53, 0.52) 0%, rgba(7, 10, 15, 0.96) 62%, #05070b 100%)",zIndex:3,pointerEvents:"none",animation:"loginFadeOut 900ms ease-out forwards"},U={position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",backgroundSize:"34px 34px",maskImage:"radial-gradient(circle at center, black 40%, transparent 88%)",opacity:.42,animation:"glowReveal 820ms ease-out both"},V={width:"100%",maxWidth:404,justifySelf:"end",padding:"90px 50px 40px",position:"relative",zIndex:4,overflow:"hidden",border:"1px solid rgba(88, 166, 255, 0.2)",background:"linear-gradient(180deg, rgba(19, 28, 42, 0.97) 0%, rgba(14, 20, 30, 0.96) 100%)",boxShadow:"0 30px 80px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",backdropFilter:"blur(14px)",animation:"loginReveal 720ms cubic-bezier(.2,.8,.2,1) 140ms both"},Y={position:"absolute",inset:"0 0 auto 0",height:4,background:"linear-gradient(90deg, #58a6ff 0%, #56d364 50%, #58a6ff 100%)"},Z={marginBottom:18,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"},J={display:"inline-flex",alignItems:"center",padding:"6px 10px",borderRadius:999,border:"1px solid rgba(88, 166, 255, 0.2)",background:"rgba(88, 166, 255, 0.1)",color:"#8ec5ff",fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:16},Q={marginTop:22},X={color:"#f4fbff",fontSize:"clamp(44px, 6vw, 78px)",lineHeight:.94,letterSpacing:"-0.06em",fontWeight:800,margin:0,textWrap:"balance"},_={marginTop:18,maxWidth:470,color:"rgba(222,231,241,0.74)",fontSize:15,lineHeight:1.65},$={marginTop:34,display:"grid",gap:12},ee={position:"absolute",inset:0,zIndex:1,pointerEvents:"none"},te={position:"absolute",right:-150,top:8,width:760,animation:"loginReveal 920ms cubic-bezier(.2,.8,.2,1) 240ms both"},ae={position:"absolute",inset:"10% 14% 18% 10%",borderRadius:"50%",border:"1px solid rgba(113, 244, 255, 0.28)",boxShadow:"0 0 42px rgba(53, 214, 255, 0.12)",transform:"rotate(18deg)"},oe={position:"absolute",inset:"24% 10% 12% 18%",borderRadius:"50%",border:"1px solid rgba(71, 186, 255, 0.2)",boxShadow:"0 0 44px rgba(71, 186, 255, 0.11)",transform:"rotate(-34deg)"},ie={position:"absolute",inset:"6% 2% 2% 2%",background:"radial-gradient(circle, rgba(26, 241, 255, 0.2) 0%, rgba(12, 144, 255, 0.16) 30%, rgba(4, 8, 15, 0) 78%)",filter:"blur(54px)",transform:"translateZ(0)"},ne={position:"relative",width:"130%",display:"block",opacity:.84,filter:"drop-shadow(0 0 26px rgba(38, 226, 255, 0.16)) drop-shadow(0 0 72px rgba(25, 129, 255, 0.12))",animation:"astronautFloat 6.4s ease-in-out infinite"},l={display:"flex",alignItems:"center",gap:10,color:"#c7d4e2",fontSize:13,letterSpacing:".01em"},d={width:8,height:8,borderRadius:999,background:"linear-gradient(135deg, #58a6ff 0%, #56d364 100%)",boxShadow:"0 0 18px rgba(88, 166, 255, 0.45)",flexShrink:0},re={display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:2},se={width:118,display:"block",filter:"drop-shadow(0 12px 26px rgba(88, 166, 255, 0.14))"},le={marginTop:10,color:"#f4fbff",fontSize:21,fontWeight:750,letterSpacing:"-0.04em"},de={marginTop:6,color:"rgba(222,231,241,0.72)",fontSize:12},ce={display:"grid",gap:11},y={display:"grid",gap:7},v={fontSize:12,color:"#b4c3d3",fontWeight:600,letterSpacing:".02em"},j={display:"flex",alignItems:"center",gap:10,border:"1px solid rgba(88, 166, 255, 0.18)",borderRadius:14,background:"linear-gradient(180deg, rgba(28, 36, 49, 0.92), rgba(18, 25, 36, 0.96))",padding:"0 12px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.03)"},w={flex:1,background:"transparent",border:"none",color:"var(--text-primary)",padding:"9px 0"},pe={display:"flex",justifyContent:"flex-end",marginTop:-2},ge={appearance:"none",background:"transparent",border:"none",padding:0,color:"#8ec5ff",fontSize:12,cursor:"pointer"},ue={padding:10,background:"rgba(86, 211, 100, 0.1)",border:"1px solid rgba(86, 211, 100, 0.24)",borderRadius:12,color:"#b8f3c2",fontSize:12},xe={justifyContent:"center",padding:"10px 16px",marginTop:4,borderRadius:14,background:"linear-gradient(135deg, #1f6feb 0%, #2f81f7 50%, #58a6ff 100%)",boxShadow:"0 16px 34px rgba(31, 111, 235, 0.28)"},be={color:"rgba(180,195,211,0.58)",fontSize:12,letterSpacing:".02em"},me={position:"absolute",width:420,height:420,background:"rgba(31, 111, 235, 0.2)",filter:"blur(95px)",top:-110,left:-70,animation:"glowReveal 1s ease-out 120ms both"},fe={position:"absolute",width:320,height:320,background:"rgba(86, 211, 100, 0.12)",filter:"blur(90px)",bottom:-70,right:-30,animation:"glowReveal 1.1s ease-out 220ms both"},he={position:"absolute",width:260,height:260,background:"rgba(210, 153, 34, 0.08)",filter:"blur(95px)",top:"42%",right:"16%",animation:"glowReveal 1.15s ease-out 280ms both"};export{je as default};
