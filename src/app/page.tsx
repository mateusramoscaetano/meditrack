"use client";

import { useState, useTransition } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

function MediTrackCalendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const userId = "66f6f7251e72438e25762bc2";
  const queryClient = useQueryClient();

  const fetchMedicationLogs = async (
    date: dayjs.Dayjs
  ): Promise<
    {
      userId: string;
      id: string;
      date: Date;
      taken: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[]
  > => {
    const startDate = date.startOf("month").format("YYYY-MM-DD");
    const endDate = date.endOf("month").format("YYYY-MM-DD");
    const response = await fetch(
      `/api/medication?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) throw new Error("Failed to fetch medication logs");

    return await response.json();
  };

  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["medicationLogs", currentDate.format("YYYY-MM")],
    queryFn: async () => await fetchMedicationLogs(currentDate),
  });

  const updateMedicationLog = async ({
    date,
    taken,
  }: {
    date: string;
    taken: boolean;
  }) => {
    const response = await fetch("/api/medication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, taken }),
    });
    if (!response.ok) throw new Error("Failed to update medication log");
    return response.json();
  };

  const mutation = useMutation({
    mutationFn: updateMedicationLog,
    onMutate: async (newLog) => {
      // Cancelar queries pendentes para "medicationLogs"
      await queryClient.cancelQueries({ queryKey: ["medicationLogs"] });

      // Pega os logs anteriores do cache
      const previousLogs = queryClient.getQueryData<typeof logs>([
        "medicationLogs",
        currentDate.format("YYYY-MM"),
      ]);

      // Otimisticamente atualizar o estado local
      if (previousLogs) {
        queryClient.setQueryData<typeof logs>(
          ["medicationLogs", currentDate.format("YYYY-MM")],
          (oldLogs) => {
            if (!oldLogs) {
              return [
                {
                  ...newLog,
                  userId,
                  id: "temp",
                  date: new Date(newLog.date),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ];
            }

            // Garantir que o log do dia correto seja atualizado
            const updatedLogs = oldLogs.map((log) => {
              if (dayjs(log.date).format("YYYY-MM-DD") === newLog.date) {
                return { ...log, taken: newLog.taken };
              }
              return log;
            });

            // Adiciona o novo log, caso não exista
            const exists = oldLogs.some(
              (log) => dayjs(log.date).format("YYYY-MM-DD") === newLog.date
            );

            if (!exists) {
              updatedLogs.push({
                ...newLog,
                userId,
                id: "temp",
                date: new Date(newLog.date),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            return updatedLogs;
          }
        );
      }

      return { previousLogs };
    },
    onError: (err, newLog, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData<typeof logs>(
          ["medicationLogs", currentDate.format("YYYY-MM")],
          context.previousLogs
        );
      }
      toast({
        title: "Erro",
        description:
          "Falha ao atualizar o status da medicação. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["medicationLogs"] });
    },
  });
  const toggleDay = (day: dayjs.Dayjs) => {
    const formattedDay = day.tz("America/Sao_Paulo").format("YYYY-MM-DD");
    const existingLog = logs?.find(
      (log) => dayjs(log.date).format("YYYY-MM-DD") === formattedDay
    );
    const isTaken = existingLog ? existingLog.taken : false;
    mutation.mutate(
      { date: formattedDay, taken: !isTaken },
      {
        onSuccess: () => {
          toast({
            title: day.isSame(dayjs(), "day")
              ? "Medicação de hoje"
              : "Status da medicação",
            description: !isTaken
              ? "Marcada como tomada. Ótimo trabalho!"
              : "Marcada como não tomada. Cuide-se!",
            duration: 3000,
          });
        },
      }
    );
  };

  const goToPreviousMonth = () => {
    startTransition(() => {
      setCurrentDate((prev) => prev.subtract(1, "month"));
    });
  };

  const goToNextMonth = () => {
    startTransition(() => {
      setCurrentDate((prev) => prev.add(1, "month"));
    });
  };

  const daysInMonth = Array.from(
    { length: currentDate.daysInMonth() },
    (_, i) => currentDate.startOf("month").add(i, "day")
  );

  const isDayTaken = (day: dayjs.Dayjs) => {
    const formattedDay = day.format("YYYY-MM-DD");
    return (
      logs?.some(
        (log) =>
          dayjs(log.date).format("YYYY-MM-DD") === formattedDay && log.taken
      ) || false
    );
  };

  return (
    <div className="w-full h-full mx-auto p-4 bg-zinc-950 text-[#333] flex items-center justify-center flex-col space-y-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-muted flex items-center justify-center gap-2">
          <Pill className="size-8" />
          MediTrack
        </h1>
        <p className="text-sm text-[#666]">Acompanhe Sua Medicação Diária</p>
        {isLoading && <div className="text-white text-xs">Carregando...</div>}
      </header>
      <div className="bg-zinc-800 rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            disabled={isPending}
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
            disabled={isPending}
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
                disabled={isLoading || isPending}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                  isDayTaken(day)
                    ? "bg-zinc-900 text-white"
                    : " text-white hover:bg-zinc-800 hover:text-white"
                } ${
                  isLoading || isPending ? "opacity-50 cursor-not-allowed" : ""
                }`}
                aria-label={`${day.format("D [de] MMMM")} - ${
                  isDayTaken(day) ? "Medicação tomada" : "Medicação não tomada"
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

export default function Component() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  return (
    <QueryClientProvider client={client}>
      <MediTrackCalendar />
    </QueryClientProvider>
  );
}
