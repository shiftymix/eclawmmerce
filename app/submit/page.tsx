"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  USE_CASE_IDS,
  USE_CASE_NAMES,
  USE_CASE_ICONS,
  ENTRY_TYPE_CONFIG,
  type UseCaseId,
  type EntryType,
} from "@/lib/supabase/types";

const ENTRY_TYPES: { key: EntryType; label: string; description: string }[] = [
  { key: "tool", label: "TOOL", description: "A standalone product or platform" },
  { key: "feature", label: "FEATURE", description: "A new feature from an existing tool" },
  { key: "update", label: "UPDATE", description: "A platform update or release" },
  { key: "indie", label: "INDIE", description: "An indie/community project" },
];

export default function SubmitPage() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<EntryType>("tool");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isOpenSource, setIsOpenSource] = useState(false);
  const [pricingModel, setPricingModel] = useState("freemium");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [parentSearch, setParentSearch] = useState("");
  const [parentResults, setParentResults] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const showParentPicker = entryType === "feature" || entryType === "update";

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const searchParent = async (query: string) => {
    setParentSearch(query);
    setSelectedParent(null);
    if (query.length < 2) {
      setParentResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/tools/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setParentResults(data);
    } catch {
      setParentResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tools/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          github_url: githubUrl || null,
          description,
          is_open_source: isOpenSource,
          pricing_model: pricingModel,
          entry_type: entryType,
          parent_id: selectedParent?.id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Submission failed");
        setLoading(false);
        return;
      }

      router.push(data.redirectUrl);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-pixel-lg text-text-primary mb-2">SUBMIT AN ENTRY</h1>
      <p className="text-xs font-mono text-text-secondary mb-8">
        Submit a tool, feature release, platform update, or indie project for
        automated assessment. No account required. The AI will score it across
        all 10 use cases.
      </p>

      {error && (
        <div className="bg-crab-red/10 pixel-border-red px-4 py-2 mb-6 text-xs font-mono text-crab-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entry Type Selector */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-2">
            ENTRY TYPE *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENTRY_TYPES.map(({ key, label, description: desc }) => {
              const config = ENTRY_TYPE_CONFIG[key];
              const isActive = entryType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setEntryType(key);
                    if (key === "tool" || key === "indie") {
                      setSelectedParent(null);
                      setParentSearch("");
                    }
                  }}
                  className="px-3 py-2 text-left transition-all"
                  style={{
                    border: `1px solid ${isActive ? config.color : "#2e3450"}`,
                    backgroundColor: isActive ? `${config.color}15` : "transparent",
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-bold block"
                    style={{ color: config.color }}
                  >
                    {label}
                  </span>
                  <span className="text-[9px] font-mono text-text-secondary">
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parent Tool Picker */}
        {showParentPicker && (
          <div>
            <label className="block text-xs font-mono text-text-secondary mb-1">
              PARENT TOOL (optional)
            </label>
            {selectedParent ? (
              <div className="flex items-center gap-2 bg-bg pixel-border px-3 py-2">
                <span className="text-sm font-mono text-text-primary flex-1">
                  {selectedParent.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParent(null);
                    setParentSearch("");
                  }}
                  className="text-xs font-mono text-text-secondary hover:text-crab-red"
                >
                  CLEAR
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={parentSearch}
                  onChange={(e) => searchParent(e.target.value)}
                  className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
                    focus:outline-none focus:border-crab-red"
                  placeholder="Search for parent tool..."
                />
                {parentResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface pixel-border max-h-40 overflow-y-auto">
                    {parentResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setSelectedParent(result);
                          setParentSearch(result.name);
                          setParentResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm font-mono text-text-primary
                          hover:bg-bg transition-colors"
                      >
                        {result.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-1">
            NAME *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red"
            placeholder="e.g. AutoFlow AI"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-1">
            URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red"
            placeholder="https://toolwebsite.com"
          />
        </div>

        {/* GitHub URL */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-1">
            GITHUB URL (optional)
          </label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red"
            placeholder="https://github.com/org/repo"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-1">
            BRIEF DESCRIPTION * ({280 - description.length} chars remaining)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={280}
            className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red resize-none h-20"
            placeholder="What does this do and who is it for?"
          />
        </div>

        {/* Open Source toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpenSource(!isOpenSource)}
            className={`w-10 h-5 pixel-border flex items-center transition-all ${
              isOpenSource ? "bg-success" : "bg-bg"
            }`}
          >
            <div
              className={`w-4 h-4 bg-text-primary transition-transform ${
                isOpenSource ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-xs font-mono text-text-secondary">
            IS OPEN SOURCE?
          </span>
        </div>

        {/* Pricing Model */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-1">
            PRICING MODEL
          </label>
          <select
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value)}
            className="w-full bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red cursor-pointer"
          >
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
            <option value="open-source">Open Source</option>
          </select>
        </div>

        {/* Use Cases */}
        <div>
          <label className="block text-xs font-mono text-text-secondary mb-2">
            PRIMARY USE CASES (select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {USE_CASE_IDS.map((id) => (
              <label
                key={id}
                className={`flex items-center gap-2 px-3 py-2 pixel-border cursor-pointer transition-all text-xs font-mono
                  ${
                    selectedUseCases.includes(id)
                      ? "border-crab-red text-text-primary"
                      : "text-text-secondary hover:border-crab-red/50"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUseCases.includes(id)}
                  onChange={() => toggleUseCase(id)}
                  className="sr-only"
                />
                <span
                  className={`w-3 h-3 pixel-border flex items-center justify-center ${
                    selectedUseCases.includes(id) ? "bg-crab-red" : "bg-bg"
                  }`}
                >
                  {selectedUseCases.includes(id) && (
                    <span className="text-white text-[8px]">✓</span>
                  )}
                </span>
                {USE_CASE_ICONS[id as UseCaseId]} {USE_CASE_NAMES[id as UseCaseId]}
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-sm py-3 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" />
              ASSESSING WITH AI...
            </span>
          ) : (
            "SUBMIT FOR ASSESSMENT →"
          )}
        </button>

        {loading && (
          <p className="text-[10px] font-mono text-text-secondary text-center">
            The AI is scoring this entry across all 10 use cases. This may take
            10-20 seconds.
          </p>
        )}
      </form>
    </div>
  );
}
