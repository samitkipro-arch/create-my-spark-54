import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Building2 } from "lucide-react";

type RoleChoice = "cabinet" | "client";

export default function WhoAreYou() {
  const [choice, setChoice] = useState<RoleChoice | null>(null);
  const navigate = useNavigate();

  const Card = ({ value, title, desc, Icon }: { value: RoleChoice; title: string; desc: string; Icon: any }) => {
    const selected = choice === value;
    return (
      <button
        onClick={() => setChoice(value)}
        className={`text-left rounded-2xl p-6 bg-[#0F172A] border transition
          hover:-translate-y-px hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#006FFF]/30
          ${selected ? "border-[#006FFF]" : "border-white/10"}`}
      >
        <Icon className="h-6 w-6 mb-3 opacity-80" />
        <div className="text-base font-medium">{title}</div>
        <div className="text-sm text-white/70 mt-1">{desc}</div>
      </button>
    );
  };

  function goNext() {
    if (!choice) return;
    navigate(`/auth?mode=signup&role=${choice}`);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#0B1220] text-white px-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-center">Qui êtes-vous ?</h1>
        <p className="text-center text-white/70 mt-2">Sélectionnez votre espace pour continuer.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Card value="cabinet" title="Comptable" desc="Je collabore avec mes clients." Icon={Briefcase} />
          <Card value="client" title="Entreprise" desc="Je collabore avec mon comptable." Icon={Building2} />
        </div>

        <button
          onClick={goNext}
          disabled={!choice}
          className="mt-8 w-full h-11 rounded-xl bg-[#006FFF] text-white disabled:opacity-50"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
