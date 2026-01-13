import React, { useState, useEffect, useRef } from 'react';
import { generateImage, summarizeConversation, analyzeGuideImage, GuideInfo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type { ImageForEditing, CharacterState } from '../App';

// Icons
const UserPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
);

const DiamondIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const WandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5l-2.293 2.293a1 1 0 000 1.414l4.586 4.586a1 1 0 001.414 0l2.293-2.293m-8.586 0L2 22m10.5-11.5L15 6.5m-3 3l-1.5-1.5" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const SquareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
);

const LandscapeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="7" width="18" height="10" rx="2" />
    </svg>
);

const PortraitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="7" y="3" width="10" height="18" rx="2" />
    </svg>
);

const predefinedStyles = [
    { value: 'watercolor', label: '水彩画', mode: 'create' },
    { value: 'oil-painting', label: '油絵', mode: 'create' },
    { value: 'realistic', label: 'リアル', mode: 'create' },
    { value: 'anime', label: 'アニメ', mode: 'create' },
    { value: 'chibi', label: 'ちびキャラ', mode: 'create' },
    { value: 'line-art', label: '線画', mode: 'create' },
    { value: '3d-render', label: '3D', mode: 'create' },
    { value: 'plushie', label: 'ぬいぐるみ', mode: 'play' },
    { value: 'manga', label: '4コマ漫画', mode: 'play' },
    { value: 'sns-icons-6', label: 'SNSアイコン(6種)', mode: 'play' },
    { value: 'instruction-manual', label: 'Databook Style', mode: 'play' },
    { value: 'picture-book', label: '絵本の見開き', mode: 'play' },
    { value: 'other', label: 'その他', mode: 'both' },
];

const angleOptions = [
    { value: 'auto', label: 'おまかせ', icon: '✨' },
    { value: 'close-up', label: 'アップ', icon: '👀' },
    { value: 'medium', label: 'ふつう', icon: '👤' },
    { value: 'long', label: '引き', icon: '🏔️' },
    { value: 'low-angle', label: 'あおり', icon: '🔼' },
    { value: 'high-angle', label: 'ふかん', icon: '🔽' },
];

const angleInstructionMap: Record<string, string> = {
    'close-up': '構図：キャラクターの表情や瞳の輝きを強調する、顔中心の至近距離からのクローズアップ。背景は美しくボケている。',
    'medium': '構図：キャラクターの上半身と周囲のアイテムがバランスよく収まる、標準的なミディアムショット。',
    'long': '構図：全身と広大な背景、空や風景が贅沢に入るロングショット・フルショット。',
    'low-angle': '構図：地面に近い低い位置から見上げるような、ダイナミックで迫力のあるローアングル。',
    'high-angle': '構図：高い位置から見下ろすような、キャラクターが愛らしく見えるハイアングル、俯瞰構図。',
};

interface ImageGeneratorProps {
  mode: 'create' | 'play';
  characters: CharacterState[];
  setCharacters: React.Dispatch<React.SetStateAction<CharacterState[]>>;
  onStartEditing: (image: ImageForEditing) => void;
  onStartAnimating: (image: ImageForEditing) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ mode, characters, setCharacters, onStartEditing, onStartAnimating }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [log, setLog] = useState<string>('');
  const [style, setStyle] = useState<string>(mode === 'create' ? 'anime' : 'plushie');
  const [angle, setAngle] = useState<string>('auto');
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [useProModel, setUseProModel] = useState<boolean>(false);
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setStyle(mode === 'create' ? 'anime' : 'plushie');
  }, [mode]);

  useEffect(() => {
    const checkApiKey = async () => {
        const aistudio = (window as any).aistudio;
        if (aistudio?.hasSelectedApiKey) {
            const hasKey = await aistudio.hasSelectedApiKey();
            setHasApiKey(hasKey);
        }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) {
        try {
            await aistudio.openSelectKey();
            setHasApiKey(true);
            setShowUpgradeModal(false);
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleSummarize = async () => {
      if (!log) return;
      setIsSummarizing(true);
      setError(null);
      try {
          const summary = await summarizeConversation(log, angle);
          setPrompt(summary);
      } catch (err) {
          setError("プロンプトの作成に失敗しました。");
      } finally {
          setIsSummarizing(false);
      }
  };

  const handleAddCharacter = () => {
    setCharacters(prev => [...prev, {
      id: Date.now().toString(),
      name: `新キャラ`,
      isActive: true,
      images: []
    }]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, charId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const { base64, mimeType } = await fileToBase64(file);
      const url = URL.createObjectURL(file);
      setCharacters(prev => prev.map(c => c.id === charId ? {
        ...c, images: [{ url, base64, mimeType }]
      } : c));
    }
  };

  const toggleCharacterActive = (charId: string) => {
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, isActive: !c.isActive } : c));
  };

  const insertCharacterToPrompt = (name: string) => {
    if (!promptRef.current) return;
    const textarea = promptRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const insertText = `「${name}」`;
    setPrompt(before + insertText + after);
    
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
    }, 0);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ai-painter-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    if (useProModel && !hasApiKey) {
        setShowUpgradeModal(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    setGuideInfo(null);
    try {
        const activeCharacters = characters.filter(c => c.isActive);
        let finalPrompt = prompt;

        if (angle !== 'auto' && angleInstructionMap[angle]) {
            finalPrompt += `\n${angleInstructionMap[angle]}`;
        }

        if (style === 'realistic') {
            finalPrompt = `「${prompt}」を、超高精細なフォトリアル・シネマティックスタイルで描いてください。
            Professional high-end photography, 8k resolution, realistic human skin texture, natural lighting, cinematic mood.`;
        } else if (style === 'plushie') {
            const charNames = activeCharacters.map(c => `「${c.name}」`).join('や');
            finalPrompt = `${charNames ? `${charNames}をモデルにした、` : ''}最高品質で愛らしい「ぬいぐるみ（Plushie）」を生成してください。
            High quality, intricate plush texture, glistening glass eyes, warm and cozy aesthetic, high resolution.`;
        } else if (style === 'instruction-manual') {
            const charNames = activeCharacters.map(c => `「${c.name}」`).join(' and ');
            finalPrompt = `Create a professional "English Language AAA-Game Databook" layout for the scene: "${prompt}". 
            
            【CORE DIRECTIVE】: All UI text in the image MUST BE IN ENGLISH ONLY. 
            【VISUAL STYLE】: Minimalist but high-tech, like a masterwork concept art sheet. Grid lines, technical notations.
            【COMPOSITION】: 
               - Feature: High-quality full-body art of ${charNames} in the center.
               - UI Elements: Technical English headings like "ENTITY ANALYSIS", "STATISTICAL OVERVIEW", "MISSION ARCHIVE".
               - Details: Blueprint background, subtle UI scan lines, radar charts, HP bars in corners.
               - Insets: Small square tactical map mockups or equipment blueprints.
            Professional technical layout, 8k resolution, cinematic UI design, masterclass typography, English language only.`;
        } else if (style === 'picture-book') {
            const charNames = activeCharacters.map(c => `「${c.name}」`).join('と');
            finalPrompt = `木の机の上に置かれた、物語の核心を突く美しい絵本の見開きページ。
            【左ページ】：情景（${prompt}）に基づいた、優しく語りかけるような「手書き風の日本語テキスト」が配置されている。
            【右ページ】：最高品質の水彩画タッチで描かれた、「${prompt}」の幻想的な挿絵。 cinematic lighting, masterpieces of children's book illustration.`;
        } else if (style === 'manga') {
            finalPrompt = `「${prompt}」というストーリーを、伝統的な日本の「4コマ漫画（Yonkoma Manga）」形式で描いてください。
            【構成】：物語が1コマ目から順に「起（導入）」「承（展開）」「転（変化）」「結（結末）」の4つのコマ割りで進むように描いてください。
            【描画】：明確なコマの境界線を持つ高品質なマンガスタイル。 Japanese Manga Style with Ki-Sho-Ten-Ketsu narrative structure.`;
        } else if (style === 'sns-icons-6') {
            const charNames = activeCharacters.map(c => `「${c.name}」`).join('や');
            finalPrompt = `SNS用の円形アイコン素材6種類のセットを、1枚の画像に2x3のグリッド形式で描いてください。${charNames ? `${charNames}をモデルにした、` : ''} Vibrant digital art, cute chibi avatar collection.`;
        } else {
            const styleLabel = predefinedStyles.find(s => s.value === style)?.label;
            finalPrompt += `\nStyle: ${styleLabel}`;
        }

        const base64 = await generateImage(finalPrompt, activeCharacters, aspect, useProModel, resolution, angle);
        const imageUrl = `data:image/png;base64,${base64}`;
        setGeneratedImage(imageUrl);

        if (style === 'instruction-manual') {
            setIsAnalyzing(true);
            try {
                const info = await analyzeGuideImage(base64);
                setGuideInfo(info);
            } catch (err) {
                console.error("Analysis failed", err);
            } finally {
                setIsAnalyzing(false);
            }
        }
    } catch (err: any) {
        let msg = err instanceof Error ? err.message : "描画に失敗しました。";
        if (msg.includes("Requested entity was not found")) {
            setHasApiKey(false);
            setError("プロプランのアクティベーションに失敗しました。再度設定を確認してください。");
            setShowUpgradeModal(true);
        } else {
            setError(msg);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const filteredStyles = predefinedStyles.filter(s => s.mode === mode || s.mode === 'both');
  const activeCharacters = characters.filter(c => c.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* アップグレード案内モーダル（演出） */}
      {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-4xl">💎</div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-stone-700">プロ・メンバーシップ</h3>
                    <p className="text-sm text-stone-400">
                        最高品質のAIモデルで、あなたの空想を完璧な形に。4K出力や動画生成も解放されます。
                    </p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl text-[10px] text-stone-500 text-left leading-relaxed">
                      ※この機能の利用にはGoogleアカウントとの連携（APIキー設定）が必要です。連携には<a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline font-bold">Google Cloudの課金設定</a>が必要です。
                  </div>
                  <div className="space-y-3">
                    <button onClick={handleSelectKey} className="w-full py-4 bg-rose-400 text-white rounded-full font-black tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-100">
                        プロ版を有効化する
                    </button>
                    <button onClick={() => { setShowUpgradeModal(false); setUseProModel(false); }} className="text-stone-400 text-xs font-bold hover:text-stone-600">
                        今はスタンダードで描く
                    </button>
                  </div>
              </div>
          </div>
      )}

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-stone-700">
            {mode === 'create' ? '空想を書き起こす' : '物語で遊ぶ'}
        </h1>
        <p className="text-stone-400 italic">
            Quiet Atelier - Storytelling Through Vision
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr] gap-8">
        <div className="space-y-6">
          
          {/* Step 1：視点を決める */}
          <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">Step 1：視点を決める</h3>
            <div className="flex flex-wrap gap-1.5">
              {angleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAngle(opt.value)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all border ${
                    angle === opt.value 
                      ? 'bg-rose-400 border-rose-400 text-white shadow-sm' 
                      : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-rose-200'
                  }`}
                >
                  <span className="mr-1.5">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Step 2：物語を紡ぐ */}
          <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">Step 2：物語を紡ぐ (今日の会話ログをコピペ)</h3>
            <textarea 
              value={log} 
              onChange={(e) => setLog(e.target.value)} 
              placeholder="心に残った会話や、日記の断片をここに..." 
              className="w-full h-20 bg-stone-50 rounded-2xl p-4 text-xs text-stone-500 border border-stone-100 outline-none resize-none focus:border-rose-200 transition-colors" 
            />
            <button onClick={handleSummarize} disabled={isSummarizing || !log} className="w-full py-2.5 bg-white border-2 border-rose-100 rounded-full text-rose-400 text-[10px] font-black tracking-widest hover:bg-rose-50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2">
              {isSummarizing ? <Spinner size="sm" /> : <WandIcon />}
              <span>ログからシーンを要約</span>
            </button>
          </section>

          {/* Step 3：参考画像 ある？ */}
          <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">Step 3：参考画像 ある？(登場人物や小物の画像)</h3>
              <button onClick={handleAddCharacter} className="flex items-center space-x-2 px-3 py-1 bg-stone-50 border border-stone-100 rounded-full text-rose-400 text-[9px] font-bold hover:bg-rose-100 transition-all">
                <UserPlusIcon />
                <span>追加</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {characters.map(char => (
                <div key={char.id} className={`flex items-center p-1 rounded-full border transition-all ${char.isActive ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-white border-stone-100 opacity-60'}`}>
                  <label className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden cursor-pointer border border-white shadow-inner">
                    {char.images[0] ? <img src={char.images[0].url} className="w-full h-full object-cover" /> : <span className="text-stone-300 text-[10px]">+</span>}
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, char.id)} />
                  </label>
                  <input value={char.name} onChange={(e) => setCharacters(prev => prev.map(c => c.id === char.id ? {...c, name: e.target.value} : c))} className="ml-2 w-12 text-[9px] font-bold text-stone-700 outline-none bg-transparent" />
                  <button onClick={() => toggleCharacterActive(char.id)} className={`ml-1.5 w-4 h-4 rounded-full flex items-center justify-center ${char.isActive ? 'bg-rose-400 text-white' : 'bg-stone-200 text-white'}`}><CheckIcon /></button>
                </div>
              ))}
            </div>
          </section>

          {/* Step 4：こんなシーンでどう？ */}
          <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">Step 4：こんなシーンでどう？ (プロンプト生成・編集)</h3>
            <div className="flex flex-wrap gap-2 mb-2">
                {activeCharacters.map(char => (
                    <button
                        key={char.id}
                        onClick={() => insertCharacterToPrompt(char.name)}
                        className="flex items-center space-x-1 px-2 py-1 bg-stone-50 hover:bg-rose-50 rounded-full border border-stone-100 hover:border-rose-200 transition-all text-[9px] font-bold text-stone-500"
                    >
                        {char.name}
                    </button>
                ))}
            </div>
            <textarea 
              ref={promptRef} 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              placeholder="描きたい情景の、具体的な筆致をここに..." 
              className="w-full h-24 text-stone-700 bg-transparent outline-none resize-none placeholder:text-stone-300 text-sm leading-relaxed" 
            />
          </section>

          {/* Step 5：お好きなスタイルで */}
          <div className="grid grid-cols-2 gap-4">
            <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">Step 5：お好きなスタイルで</h3>
              <div className="grid grid-cols-1 gap-1">
                {filteredStyles.slice(0, 6).map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)} className={`p-1.5 rounded-lg border text-[9px] font-bold transition-all ${style === s.value ? 'border-rose-300 bg-rose-50 text-rose-500 shadow-sm' : 'border-stone-100 bg-white text-stone-500'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-[2rem] p-6 border-2 border-stone-100 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-rose-300 tracking-[0.2em] uppercase">画風・比率</h3>
              <div className="flex flex-col space-y-2">
                {[
                  { value: '1:1', icon: <SquareIcon /> },
                  { value: '16:9', icon: <LandscapeIcon /> },
                  { value: '9:16', icon: <PortraitIcon /> }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setAspect(item.value as any)}
                    className={`flex items-center justify-center p-2.5 rounded-xl border transition-all ${aspect === item.value ? 'bg-rose-50 border-rose-300 text-rose-500 shadow-sm' : 'bg-white border-stone-100 text-stone-400'}`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Step 6：仕上げる（描く！） */}
          <section className="space-y-4 pt-4">
            <div className={`flex items-center justify-between px-6 py-4 rounded-[2rem] border-2 transition-all ${useProModel ? 'bg-rose-50 border-rose-200' : 'bg-white border-stone-100'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${useProModel ? 'bg-rose-400 text-white shadow-lg' : 'bg-stone-100 text-stone-400'}`}>
                    <DiamondIcon />
                  </div>
                  <div>
                    <span className={`block text-[10px] font-black tracking-[0.1em] uppercase ${useProModel ? 'text-rose-500' : 'text-stone-400'}`}>Pro Membership</span>
                    <span className="text-[9px] text-stone-400 font-bold">{useProModel ? 'プロ版エンジン起動中' : 'プロ機能を利用する'}</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-110">
                  <input type="checkbox" className="sr-only peer" checked={useProModel} onChange={(e) => setUseProModel(e.target.checked)} />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-400"></div>
                </label>
            </div>

            <Button onClick={handleGenerate} isLoading={isLoading} disabled={!prompt} className="w-full py-7 text-xl rounded-full bg-rose-200 hover:bg-rose-300 text-rose-600 shadow-xl border-none transition-all active:scale-95 font-black tracking-[0.1em]">
              Step 6：描いてみせます
            </Button>
          </section>

        </div>

        {/* Result Area */}
        <div className="space-y-6">
          <div className="bg-stone-50 rounded-[3.5rem] p-5 min-h-[550px] flex flex-col items-center justify-center border-8 border-white shadow-2xl overflow-hidden relative">
            {isLoading ? (
              <div className="text-center space-y-4">
                <Spinner size="lg" className="text-rose-300 mx-auto" />
                <p className="text-stone-400 text-xs font-black tracking-widest animate-pulse uppercase">Visualizing Fragment...</p>
              </div>
            ) : generatedImage ? (
              <div className="w-full flex flex-col items-center animate-in fade-in duration-1000">
                <img src={generatedImage} alt="Generated" className="w-full h-auto rounded-[2.5rem] shadow-xl mb-6 border-4 border-white" />
                
                {(guideInfo || isAnalyzing) && (
                    <div className="w-full bg-[#0a0a0f] text-stone-200 p-7 rounded-[2.5rem] border-4 border-[#1c1c2b] font-mono shadow-2xl overflow-hidden relative">
                        {isAnalyzing ? (
                            <div className="py-16 text-center space-y-5">
                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
                                <p className="text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">Accessing Archive...</p>
                            </div>
                        ) : guideInfo && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="border-b-2 border-stone-800 pb-5 flex justify-between items-end">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-3 h-12 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                                        <div>
                                            <p className="text-[10px] text-cyan-500 font-black tracking-[0.2em] uppercase opacity-70 mb-1">Entity Metadata</p>
                                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">{guideInfo.characterName}</h3>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-stone-600 font-mono tracking-tighter">REF: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                        <span className="px-2 py-0.5 bg-rose-600/10 text-rose-500 text-[9px] font-black rounded border border-rose-500/20 uppercase tracking-[0.2em]">Master</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] text-stone-500 font-black tracking-[0.2em] uppercase mb-2 flex items-center">
                                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                                                Bio-Description
                                            </p>
                                            <div className="bg-[#12121d] p-4 rounded-2xl border border-stone-800 shadow-inner">
                                                <p className="text-[11px] text-stone-400 leading-relaxed italic font-medium">
                                                    "{guideInfo.description}"
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[9px] text-cyan-500 font-black tracking-[0.2em] uppercase mb-2">Capabilities</p>
                                            {guideInfo.stats.map((s, i) => (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="flex justify-between text-[9px] font-black text-stone-500 tracking-wider">
                                                        <span>{s.label.toUpperCase()}</span>
                                                        <span className="text-cyan-400">{s.value} <span className="text-stone-800">/</span> {s.max}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden p-[1px] border border-stone-800">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-1000" 
                                                            style={{ width: `${(s.value/s.max)*100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[9px] text-stone-500 font-black tracking-[0.2em] uppercase mb-3 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span>
                                            Asset Registry
                                        </p>
                                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                            {guideInfo.items.map((item, i) => (
                                                <div key={i} className="bg-[#12121d] p-3.5 rounded-xl border border-stone-800/60 group/item hover:border-cyan-500/30 transition-all duration-300">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-black text-stone-100 text-[11px] uppercase tracking-tighter">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-[7px] text-cyan-500 font-black uppercase opacity-50 tracking-widest">{item.rarity || 'Core'}</span>
                                                    </div>
                                                    <p className="text-stone-600 text-[10px] font-medium leading-tight">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-5 border-t border-stone-900 flex justify-between items-center opacity-40">
                                    <div className="flex space-x-1">
                                        {[1,2,3,4].map(i => <div key={i} className="w-1 h-1 bg-stone-700 rounded-full"></div>)}
                                    </div>
                                    <p className="text-[8px] font-mono tracking-[0.5em] text-stone-700 uppercase">System Sync // Aesthetic Database v5.2</p>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>
                        <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/10 animate-scan"></div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button onClick={handleDownload} className="flex items-center space-x-2 px-7 py-3.5 bg-white rounded-full shadow-lg text-stone-600 text-sm font-black tracking-widest hover:bg-stone-50 hover:-translate-y-0.5 transition-all">
                    <DownloadIcon />
                    <span>SAVE</span>
                  </button>
                  <button onClick={() => onStartEditing({ url: generatedImage, base64: generatedImage.split(',')[1], mimeType: 'image/png' })} className="px-7 py-3.5 bg-white rounded-full shadow-lg text-rose-500 text-sm font-black tracking-widest hover:-translate-y-0.5 transition-all">
                    EDIT
                  </button>
                  <button onClick={() => onStartAnimating({ url: generatedImage, base64: generatedImage.split(',')[1], mimeType: 'image/png' })} className="px-7 py-3.5 bg-white rounded-full shadow-lg text-rose-500 text-sm font-black tracking-widest hover:-translate-y-0.5 transition-all">
                    ANIMATE
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-stone-200 space-y-3">
                <div className="text-6xl opacity-10">🕯️</div>
                <p className="font-black uppercase tracking-[0.4em] text-[10px]">Atelier Quiet // この一瞬を残したい</p>
              </div>
            )}
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl text-center text-xs font-black tracking-widest border border-rose-100 shadow-sm animate-in fade-in">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
