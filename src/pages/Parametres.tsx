import { MainLayout } from "@/components/Layout/MainLayout";

const Parametres = () => {
  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <h1 className="hidden md:block text-2xl md:text-3xl font-bold">Paramètres</h1>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm md:text-base">
          Section Paramètres à venir
        </div>
      </div>
    </MainLayout>
  );
};

export default Parametres;
