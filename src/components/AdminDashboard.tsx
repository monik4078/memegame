import React, { useState } from 'react';
import { useGameStore } from '../store';
import type { GameContent, ContentType } from '../types';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Image, Music, Film, MessageSquare, Upload, Search } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const content = useGameStore((s) => s.content);
  const addContent = useGameStore((s) => s.addContent);
  const deleteContent = useGameStore((s) => s.deleteContent);
  const updateContent = useGameStore((s) => s.updateContent);
  const stats = useGameStore((s) => s.getStats());

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentType | 'all'>('all');
  const [search, setSearch] = useState('');

  const emptyForm: Omit<GameContent, 'id' | 'createdAt'> = {
    type: 'meme-dialogue',
    question: '',
    answer: '',
    options: ['', '', '', ''],
    imageUrl: '',
    audioHint: '',
    difficulty: 'medium',
    points: 20,
  };

  const [form, setForm] = useState(emptyForm);

  const filteredContent = content.filter((c: GameContent) => {
    const matchesFilter = filter === 'all' || c.type === filter;
    const matchesSearch = search === '' || 
      c.question.toLowerCase().includes(search.toLowerCase()) ||
      c.answer.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSubmit = () => {
    if (!form.question || !form.answer) {
      alert('Please fill in the question and answer!');
      return;
    }

    const cleanOptions = form.options.filter((o) => o.trim() !== '');
    if (cleanOptions.length < 2) {
      alert('Please provide at least 2 options!');
      return;
    }
    if (!cleanOptions.includes(form.answer)) {
      alert('The answer must be one of the options!');
      return;
    }

    if (editingId) {
      updateContent({ ...form, id: editingId, createdAt: Date.now() });
      setEditingId(null);
    } else {
      addContent(form);
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const startEdit = (item: GameContent) => {
    setEditingId(item.id);
    setForm({
      type: item.type,
      question: item.question,
      answer: item.answer,
      options: item.options.length >= 4 ? item.options : [...item.options, '', '', '', ''].slice(0, 4),
      imageUrl: item.imageUrl || '',
      audioHint: item.audioHint || '',
      difficulty: item.difficulty,
      points: item.points,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const updateOption = (index: number, value: string) => {
    setForm((f) => {
      const newOpts = [...f.options];
      newOpts[index] = value;
      return { ...f, options: newOpts };
    });
  };

  const getTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'meme-dialogue': return <MessageSquare className="w-4 h-4" />;
      case 'song-tune': return <Music className="w-4 h-4" />;
      case 'movie-meme': return <Film className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'meme-dialogue': return 'Meme Dialogue';
      case 'song-tune': return 'Song Tune';
      case 'movie-meme': return 'Movie Meme';
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'text-neon-green';
      case 'medium': return 'text-neon-yellow';
      case 'hard': return 'text-neon-red';
      default: return 'text-white/50';
    }
  };

  return (
    <div className="min-h-screen bg-animated p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 animate-slideDown">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('home')} className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold gradient-text font-outfit">Admin Panel</h1>
              <p className="text-white/40 text-sm">Manage your game content</p>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); }}>
            <Plus className="w-5 h-5" />
            <span>Add Content</span>
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slideUp">
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold gradient-text">{stats.totalContent}</p>
            <p className="text-xs text-white/40">Total Content</p>
          </div>
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold gradient-text-green">{stats.byType.memeDialogue}</p>
            <p className="text-xs text-white/40">Meme Dialogues</p>
          </div>
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold text-neon-pink">{stats.byType.songTune}</p>
            <p className="text-xs text-white/40">Song Tunes</p>
          </div>
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold text-neon-cyan">{stats.byType.movieMeme}</p>
            <p className="text-xs text-white/40">Movie Memes</p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="game-card p-6 mb-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Content' : 'Add New Content'}</h2>
              <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Content Type</label>
                <select className="input-glass" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}>
                  <option value="meme-dialogue" className="bg-bg-dark">📝 Meme Dialogue</option>
                  <option value="song-tune" className="bg-bg-dark">🎵 Song Tune</option>
                  <option value="movie-meme" className="bg-bg-dark">🎬 Movie Meme</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Difficulty</label>
                <select className="input-glass" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                  <option value="easy" className="bg-bg-dark">😊 Easy (10 pts)</option>
                  <option value="medium" className="bg-bg-dark">🤔 Medium (20 pts)</option>
                  <option value="hard" className="bg-bg-dark">🔥 Hard (30 pts)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Question</label>
              <textarea className="input-glass" rows={2} placeholder="Enter your question..." value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Correct Answer (must match one of the options exactly)</label>
              <input className="input-glass" placeholder="The correct answer..." value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Options (at least 2, include the correct answer)</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/30 w-5">{i + 1}.</span>
                  <input className="input-glass flex-1" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)} />
                  <label className="flex items-center gap-1 text-xs text-white/40 cursor-pointer">
                    <input type="radio" name="answer-radio" checked={form.answer === opt} onChange={() => setForm({ ...form, answer: opt })} className="accent-neon-purple" />
                    Answer
                  </label>
                </div>
              ))}
            </div>

            {(form.type === 'meme-dialogue' || form.type === 'movie-meme') && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block flex items-center gap-2"><Image className="w-4 h-4" /> Image URL (optional)</label>
                <input className="input-glass" placeholder="https://example.com/meme.jpg" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
            )}

            {form.type === 'song-tune' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block flex items-center gap-2"><Music className="w-4 h-4" /> Audio Hint / Description</label>
                <textarea className="input-glass" rows={2} placeholder="Describe the tune or provide lyrics..." value={form.audioHint} onChange={(e) => setForm({ ...form, audioHint: e.target.value })} />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button className="btn-secondary flex items-center gap-2" onClick={cancelEdit}><X className="w-4 h-4" /> Cancel</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-slideUp">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input className="input-glass pl-10" placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(['all', 'meme-dialogue', 'song-tune', 'movie-meme'] as const).map((f) => (
              <button key={f} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'tab-active border border-purple-500/50' : 'glass text-white/40 hover:text-white/60'}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'meme-dialogue' ? '💬 Memes' : f === 'song-tune' ? '🎵 Songs' : '🎬 Movies'}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-slideUp">
          {filteredContent.length === 0 ? (
            <div className="game-card p-12 text-center">
              <Upload className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No content found. Add your first question!</p>
            </div>
          ) : (
            filteredContent.map((item: GameContent, idx: number) => (
              <div key={item.id}
                className="rounded-3xl border border-theme-card bg-theme-card p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1 animate-slideIn"
                style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center ${
                    item.type === 'meme-dialogue' ? 'bg-neon-purple/20 text-neon-purple' :
                    item.type === 'song-tune' ? 'bg-neon-pink/20 text-neon-pink' :
                    'bg-neon-cyan/20 text-neon-cyan'
                  }`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="badge bg-white/10 text-white/60">{getTypeLabel(item.type)}</span>
                    <span className={`badge ${getDifficultyColor(item.difficulty)}`}>{item.difficulty}</span>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white/90 mb-3 break-words">{item.question}</h3>
                <div className="text-sm text-white/60 space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-white/40 mb-1">Correct answer</div>
                    <div className="rounded-2xl bg-white/5 px-3 py-2 text-white/80">{item.answer}</div>
                  </div>

                  {item.options?.length ? (
                    <div>
                      <div className="text-xs uppercase tracking-[0.12em] text-white/40 mb-2">Options</div>
                      <div className="flex flex-wrap gap-2">
                        {item.options.map((opt, oidx) => (
                          <span key={oidx} className={`rounded-full px-3 py-1 text-xs ${opt === item.answer ? 'bg-neon-green/15 text-neon-green' : 'bg-white/10 text-white/60'}`}>
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {item.type === 'song-tune' && item.audioHint ? (
                    <div>
                      <div className="text-xs uppercase tracking-[0.12em] text-white/40 mb-1">Hint</div>
                      <div className="rounded-2xl bg-white/5 px-3 py-2 text-white/80">{item.audioHint}</div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <span className="badge bg-neon-yellow/20 text-neon-yellow">{item.points} pts</span>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(item)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
                      Edit
                    </button>
                    <button onClick={() => { if (confirm('Delete this content?')) deleteContent(item.id); }} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 transition">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
