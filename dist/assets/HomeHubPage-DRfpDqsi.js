import{c as d,j as t,P as b,N as h}from"./index-RI1AOVST.js";import{W as u}from"./wifi-CxLVDvkl.js";import{D as g}from"./database-ClhJtUYU.js";import{W as m}from"./wifi-off-C_iSCmf_.js";import{S as f}from"./send-BgYFvgWQ.js";/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=d("Activity",[["path",{d:"M22 12h-4l-3 9L9 3l-3 9H2",key:"d5dnw9"}]]);/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=d("ShieldAlert",[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",key:"1irkt0"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]),v=[{to:"/dashboard",label:"Dashboard",icon:u,accent:"#7cc6ff",description:"Visao geral da operacao",position:"hub-card-top-left"},{to:"/onus",label:"ONUs",icon:g,accent:"#63df86",description:"Lista e detalhes da base",position:"hub-card-top-right"},{to:"/sinal",label:"Sinal",icon:x,accent:"#8ec5ff",description:"Saude optica da rede",position:"hub-card-bottom-left"},{to:"/clientes-24h-offline",label:"Clientes 24h",icon:m,accent:"#ffb86f",description:"Clientes em atencao",position:"hub-card-bottom-right"},{to:"/linkloss",label:"Link Loss",icon:y,accent:"#ff8f7a",description:"Falhas 400, 402 e 403 do Zabbix",position:"hub-card-center-left"},{to:"/envio",label:"Envio",icon:f,accent:"#7df9ff",description:"Acoes e comunicacao",position:"hub-card-center-right"}];function O(){return t.jsxs("div",{children:[t.jsx("style",{children:B}),t.jsx(b,{title:"Central FuturaNet",subtitle:"Escolha um painel para entrar no fluxo operacional",align:"center"}),t.jsxs("section",{style:j,children:[t.jsx("div",{style:k}),t.jsx("div",{style:w}),t.jsx("div",{style:S}),t.jsxs("div",{style:A,children:[t.jsx("div",{style:I,children:"Central de navegacao"}),t.jsx("h2",{style:C,children:"Selecione um ponto da operacao ao redor do hub."}),t.jsx("p",{style:z,children:"O astronauta fica no centro da experiencia e os atalhos principais flutuam ao redor para um acesso rapido aos paineis da plataforma."})]}),t.jsxs("div",{style:R,className:"hub-stage",children:[t.jsx("div",{style:W}),t.jsx("div",{style:F,children:t.jsx("img",{src:"./astronauta-pronto.png",alt:"Astronauta FuturaNet",style:H})}),v.map(({to:a,label:i,icon:e,accent:o,description:r,position:n})=>t.jsx(h,{to:a,style:{textDecoration:"none"},children:t.jsxs("div",{className:`hub-card ${n}`,style:L(o),children:[t.jsx("div",{style:N(o),children:t.jsx(e,{size:17,color:o})}),t.jsxs("div",{children:[t.jsx("div",{style:Y,children:i}),t.jsx("div",{style:$,children:r})]})]})},a))]})]})]})}const j={position:"relative",overflow:"hidden",borderRadius:30,padding:"26px 28px 36px",marginBottom:20,border:"1px solid rgba(88,166,255,.14)",background:"linear-gradient(180deg, rgba(13, 20, 30, 0.92), rgba(10, 17, 26, 0.96))",boxShadow:"0 28px 68px rgba(0,0,0,.24)"},k={position:"absolute",width:360,height:360,left:-80,top:-80,borderRadius:"50%",background:"rgba(47, 188, 255, 0.12)",filter:"blur(70px)"},w={position:"absolute",width:420,height:420,right:-110,bottom:-140,borderRadius:"50%",background:"rgba(31, 111, 235, 0.14)",filter:"blur(90px)"},S={position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",backgroundSize:"34px 34px",maskImage:"radial-gradient(circle at center, black 42%, transparent 100%)",opacity:.55},A={position:"relative",zIndex:2,maxWidth:560,margin:"0 auto 10px",textAlign:"center"},I={fontSize:11,textTransform:"uppercase",letterSpacing:".12em",color:"#87dfff",fontWeight:700,marginBottom:10},C={margin:0,fontSize:38,lineHeight:1.02,letterSpacing:"-0.06em",color:"#f5fbff"},z={margin:"14px 0 0",fontSize:14,lineHeight:1.7,color:"rgba(230,237,243,.74)",maxWidth:500,marginInline:"auto"},R={position:"relative",zIndex:2,minHeight:620,marginTop:12},W={position:"absolute",left:"50%",top:"50%",width:520,height:520,transform:"translate(-50%, -44%)",borderRadius:"50%",background:"radial-gradient(circle, rgba(81, 225, 255, 0.16) 0%, rgba(31,111,235,0.12) 34%, transparent 72%)",filter:"blur(24px)"},F={position:"absolute",left:"50%",top:"51%",width:620,transform:"translate(-50%, -50%)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",animation:"hubAstronautFloat 7.5s ease-in-out infinite"},H={width:"40%",display:"block",filter:"drop-shadow(0 0 42px rgba(56, 208, 255, 0.18))",opacity:.96},L=a=>({position:"absolute",width:220,display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:22,border:"1px solid rgba(255,255,255,0.08)",background:"linear-gradient(180deg, rgba(20, 30, 43, 0.84), rgba(12, 18, 28, 0.92))",boxShadow:`0 18px 36px ${s(a,.14)}`,backdropFilter:"blur(12px)",transition:"transform .2s ease, border-color .2s ease, box-shadow .2s ease"}),N=a=>({width:44,height:44,flexShrink:0,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",background:s(a,.14),border:`1px solid ${s(a,.24)}`}),Y={fontSize:15,fontWeight:700,color:"#f5fbff",marginBottom:4},$={fontSize:12,lineHeight:1.45,color:"rgba(230,237,243,.72)"},B=`
  .hub-stage::before {
    content: '';
    position: absolute;
    inset: 21% 28%;
    border-radius: 50%;
    border: 1px solid rgba(142, 197, 255, 0.08);
    box-shadow: inset 0 0 40px rgba(88, 166, 255, 0.04);
    pointer-events: none;
  }

  .hub-card {
    animation: hubFloat 6.2s ease-in-out infinite;
  }

  .hub-card:hover {
    transform: translateY(-6px) scale(1.02);
  }

  .hub-card-top-left { left: 24%; top: 20%; animation-delay: .1s; }
  .hub-card-top-right { right: 24%; top: 20%; animation-delay: .5s; }
  .hub-card-bottom-left { left: 25%; bottom: 24%; animation-delay: .9s; }
  .hub-card-bottom-right { right: 22%; bottom: 18%; animation-delay: 1.3s; }
  .hub-card-center-left { left: 18%; top: 46%; transform: translateY(-50%); animation-delay: 1.5s; }
  .hub-card-center-right { right: 18%; top: 46%; transform: translateY(-50%); animation-delay: 1.7s; }
  .hub-card-center-left:hover { transform: translateY(calc(-50% - 6px)) scale(1.02); }
  .hub-card-center-right:hover { transform: translateY(calc(-50% - 6px)) scale(1.02); }

  @keyframes hubFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes hubAstronautFloat {
    0%, 100% { transform: translate(-50%, -50%) rotate(-1deg); }
    50% { transform: translate(-50%, calc(-50% - 14px)) rotate(1.5deg); }
  }

  @media (max-width: 1180px) {
    .hub-stage::before {
      inset: 120px 18% auto;
      height: 300px;
    }

    .hub-stage {
      min-height: auto !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      padding-top: 360px;
    }

    .hub-card,
    .hub-card-top-left,
    .hub-card-top-right,
    .hub-card-bottom-left,
    .hub-card-bottom-right,
    .hub-card-center-left,
    .hub-card-center-right {
      position: relative !important;
      inset: auto !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
      bottom: auto !important;
      width: 100% !important;
      transform: none !important;
    }
  }

  @media (max-width: 760px) {
    .hub-stage {
      grid-template-columns: 1fr !important;
      padding-top: 290px;
    }
  }
`;function s(a,i){const e=a.replace("#",""),o=e.length===3?e.split("").map(l=>l+l).join(""):e,r=parseInt(o,16),n=r>>16&255,c=r>>8&255,p=r&255;return`rgba(${n}, ${c}, ${p}, ${i})`}export{O as default};
