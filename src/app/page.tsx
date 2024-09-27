"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

dayjs.locale("pt-br");

export default function Component() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [takenDays, setTakenDays] = useState<string[]>([]);
  const { toast } = useToast();
  const userId = "66f6f7251e72438e25762bc2";

  useEffect(() => {
    fetchMedicationLogs();
  }, [currentDate]);

  const fetchMedicationLogs = async () => {
    const startDate = currentDate.startOf("month").format("YYYY-MM-DD");
    const endDate = currentDate.endOf("month").format("YYYY-MM-DD");
    try {
      const response = await fetch(
        `/api/medication?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch medication logs");
      const logs = await response.json();
      setTakenDays(
        logs
          .filter((log: any) => log.taken)
          .map((log: any) => dayjs(log.date).format("YYYY-MM-DD"))
      );
    } catch (error) {
      console.error("Error fetching medication logs:", error);
      toast({
        title: "Erro",
        description:
          "Falha ao carregar dados de medicação. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const toggleDay = async (day: dayjs.Dayjs) => {
    const formattedDay = day.format("YYYY-MM-DD");
    const isTaken = !takenDays.includes(formattedDay);
    try {
      const response = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: formattedDay, taken: isTaken }),
      });
      if (!response.ok) throw new Error("Failed to update medication log");
      await fetchMedicationLogs(); // Refresh the data
      toast({
        title: day.isSame(dayjs(), "day")
          ? "Medicação de hoje"
          : "Status da medicação",
        description: isTaken
          ? "Marcada como tomada. Ótimo trabalho!"
          : "Marcada como não tomada. Cuide-se!",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating medication log:", error);
      toast({
        title: "Erro",
        description:
          "Falha ao atualizar o status da medicação. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const goToPreviousMonth = () =>
    setCurrentDate((prev) => prev.subtract(1, "month"));
  const goToNextMonth = () => setCurrentDate((prev) => prev.add(1, "month"));

  const daysInMonth = Array.from(
    { length: currentDate.daysInMonth() },
    (_, i) => currentDate.startOf("month").add(i, "day")
  );

  return (
    <div className="w-full h-full mx-auto p-4 bg-zinc-950 text-[#333] flex items-center justify-center flex-col space-y-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-muted flex items-center justify-center gap-2">
          <Pill className="size-8" />
          MediTrack
        </h1>
        <p className="text-sm text-[#666]">Acompanhe Sua Medicação Diária</p>
      </header>
      <div className="bg-zinc-800 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="text-muted-foreground border-muted-foreground hover:bg-muted-foreground hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-muted">
            {currentDate.format("MMMM YYYY")}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="text-muted-foreground border-muted-foreground hover:bg-muted-foreground hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-sm text-[#666]"
            >
              {day}
            </div>
          ))}
          {Array(currentDate.startOf("month").day())
            .fill(null)
            .map((_, index) => (
              <div key={`empty-${index}`} className="h-8 w-8" />
            ))}
          {daysInMonth.map((day) => (
            <div
              key={day.toString()}
              className="flex justify-center items-center"
            >
              <button
                onClick={() => toggleDay(day)}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                  takenDays.includes(day.format("YYYY-MM-DD"))
                    ? "bg-zinc-900 text-white"
                    : "bg-muted text-[#333] hover:bg-zinc-800 hover:text-white"
                }`}
                aria-label={`${day.format("D [de] MMMM")} - ${
                  takenDays.includes(day.format("YYYY-MM-DD"))
                    ? "Medicação tomada"
                    : "Medicação não tomada"
                }`}
              >
                {day.format("D")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
