const allowedImageTypes = new Set(['image/jpeg','image/png','image/webp']);
const usage = new Map();

const geminiKey=()=>process.env.GOOGLE_API_KEY||process.env.GEMINI_API_KEY||'';
const aiConfigured=()=>Boolean(geminiKey()||process.env.OPENAI_API_KEY);
export const getLabourAIStatus=(req,res)=>res.json({success:true,configured:aiConfigured(),provider:geminiKey()?'google':process.env.OPENAI_API_KEY?'openai':null,model:process.env.GEMINI_MODEL||process.env.MINEGUARD_AI_MODEL||(geminiKey()?'gemini-3.8-flash':'gpt-4.1-mini'),features:['photo_safety_check','worker_assistant'],setupHint:aiConfigured()?null:'Add GOOGLE_API_KEY (Gemini) or OPENAI_API_KEY to the backend .env file and restart node server.js.'});

const rateLimit = (workerId) => {
  const now=Date.now();const windowMs=60_000;const previous=usage.get(workerId);
  if(!previous||now-previous.start>=windowMs){usage.set(workerId,{start:now,count:1});return true;}
  if(previous.count>=12)return false;previous.count+=1;return true;
};

const sendToModel = async (workerId,input,instructions) => {
  const googleKey=geminiKey();
  const openaiKey=process.env.OPENAI_API_KEY;
  if(!googleKey&&!openaiKey)return {error:'AI vision/chat is not configured. Set GOOGLE_API_KEY (Gemini) or OPENAI_API_KEY on the backend to enable this feature.',status:503};
  if(!rateLimit(workerId))return {error:'You have reached the AI request limit. Wait one minute and try again.',status:429};
  const useGoogle=Boolean(googleKey);
  let url,headers,body,googleModel=process.env.GEMINI_MODEL||'gemini-3.8-flash';
  if(useGoogle){
    url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(googleModel)}:generateContent`;
    headers={'x-goog-api-key':googleKey,'Content-Type':'application/json'};
    const contents=input.map(item=>({role:item.role==='assistant'?'model':'user',parts:Array.isArray(item.content)?item.content.map(part=>part.type==='input_image'?{inlineData:{mimeType:part.image_url.match(/^data:([^;]+)/)?.[1]||'image/jpeg',data:part.image_url.split(',')[1]}}:{text:part.text||''}):[{text:item.content}]}));
    body=JSON.stringify({contents,...(instructions?{systemInstruction:{parts:[{text:instructions} ]}}:{}),generationConfig:{candidateCount:1,maxOutputTokens:700}});
  }else{
    url='https://api.openai.com/v1/responses';headers={Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'};
    body=JSON.stringify({model:process.env.MINEGUARD_AI_MODEL||'gpt-4.1-mini',store:false,input,...(instructions?{instructions}:{})});
  }
  let response;
  if(useGoogle){
    const models=[...new Set([googleModel,process.env.GEMINI_FALLBACK_MODEL||'gemini-3.6-flash','gemini-3.5-flash-lite'])];
    for(const model of models){
      googleModel=model;
      url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      response=await fetch(url,{method:'POST',headers,body,signal:AbortSignal.timeout(30_000)});
      // Try the next configured fallback when a model is unavailable or temporarily overloaded.
      if(response.ok||![404,429,503].includes(response.status))break;
    }
  }else response=await fetch(url,{method:'POST',headers,body,signal:AbortSignal.timeout(30_000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){console.error('AI provider request failed:',response.status,useGoogle?'google':'openai',result.error?.status||'');return {error:[429,503].includes(response.status)?'AI provider is temporarily busy. Try again shortly. If there is immediate danger, stop work and contact your supervisor or follow the site emergency procedure.':'AI service could not process this request right now.',status:response.status===429?429:502};}
  const text=useGoogle?result.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('\n')||'':result.output?.flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n')||'';
  if(!text.trim())return {error:'AI service returned no usable response.',status:502};
  return {text,model:googleModel};
};

export const inspectSafetyImage=async(req,res)=>{
  const {photo,question='Inspect this mine-site photo for visible safety hazards.'}=req.body||{};
  if(!photo||!allowedImageTypes.has(photo.mimeType)||typeof photo.data!=='string'||photo.data.length>5_500_000)return res.status(400).json({success:false,message:'Select a JPEG, PNG, or WebP image smaller than 4 MB.'});
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(photo.data))return res.status(400).json({success:false,message:'The selected photo data is invalid.'});
  const safeQuestion=String(question).slice(0,1000);
  const prompt=`Review this mine-site photo for visible potential safety hazards. Worker question: ${safeQuestion}`;
  const instructions="You are MineGuard's worker safety visual assistant. Review only visible evidence. Do not claim certainty, diagnose injuries, or certify that a site is safe. Identify potential visible hazards, explain uncertainty, and suggest cautious immediate steps. For obvious imminent danger, advise the worker to stop, move away if safe, and alert the supervisor or use the site's emergency procedure. Do not invent mine-specific policies. Keep the response concise and plain language.";
  try{const result=await sendToModel(req.user.workerId,[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:`data:${photo.mimeType};base64,${photo.data}`,detail:'high'}]}],instructions);if(result.error)return res.status(result.status).json({success:false,message:result.error});return res.json({success:true,analysis:result.text,model:result.model||process.env.GEMINI_MODEL||process.env.MINEGUARD_AI_MODEL||(geminiKey()?'gemini-3.8-flash':'gpt-4.1-mini'),disclaimer:'AI visual review can miss hazards or misread an image. Follow mine procedures and supervisor direction; it does not replace inspection or emergency response.'});}
  catch(error){console.error('Safety image analysis failed:',error.name);return res.status(502).json({success:false,message:'Could not reach the configured AI service.'});}
};

export const askLabourAssistant=async(req,res)=>{
  const raw=Array.isArray(req.body?.messages)?req.body.messages:[];
  const messages=raw.slice(-8).filter(item=>['user','assistant'].includes(item?.role)&&typeof item.content==='string').map(item=>({role:item.role,content:item.content.trim().slice(0,1200)})).filter(item=>item.content);
  // Gemini conversations must begin with a user turn. An eight-message window can
  // otherwise start on an assistant turn once the chat has grown past four exchanges.
  while(messages[0]?.role==='assistant')messages.shift();
  if(!messages.length||messages[messages.length-1].role!=='user')return res.status(400).json({success:false,message:'Send a question to the assistant.'});
  const instructions='You are MineGuard, a practical mine-worker safety assistant. Answer concise questions about general mine safety, explain common procedures at a high level, and help the worker describe concerns to a supervisor. Do not make medical diagnoses, legal/statutory determinations, or claim a mine-specific rule unless the user provided it. If there may be imminent danger, tell the worker to stop work, move to safety if possible, alert a supervisor, and follow the site emergency procedure/SOS. Never tell someone to enter a hazardous area to investigate. Make clear when uncertain.';
  try{const result=await sendToModel(req.user.workerId,messages,instructions);if(result.error)return res.status(result.status).json({success:false,message:result.error});return res.json({success:true,answer:result.text,model:result.model||process.env.GEMINI_MODEL||process.env.MINEGUARD_AI_MODEL||(geminiKey()?'gemini-3.8-flash':'gpt-4.1-mini'),disclaimer:'General AI guidance only. Mine emergency procedures and supervisor direction take priority.'});}
  catch(error){console.error('Labour assistant request failed:',error.name);return res.status(502).json({success:false,message:error.name==='TypeError'?'The backend could not connect to Google AI. Check the computer’s internet connection and restart the local server.':'The AI service timed out. Please try again.'});}
};
