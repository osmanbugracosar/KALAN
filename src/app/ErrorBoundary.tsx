import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}
interface State {
  error: Error | null;
}

/** Bir sayfa render sırasında hata verirse tüm uygulamayı çökertmek yerine
 *  dostça bir ekran gösterir ve hata metnini ortaya koyar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] grid place-items-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-expense/10 text-expense mb-4">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-lg font-semibold text-ink">Bu sayfa açılırken bir sorun oluştu</h2>
            <p className="text-[13.5px] text-muted mt-2">
              Endişelenme, verilerin güvende. Başka bir sekmeye geçebilir ya da tekrar deneyebilirsin.
              Sorun sürerse aşağıdaki mesajı bize iletebilirsin.
            </p>
            <pre className="mt-4 text-left text-[11.5px] leading-relaxed bg-elevate border border-line rounded-lg p-3 overflow-auto max-h-40 text-expense/90 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              onClick={this.reset}
              className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-brand text-white text-[14px] font-medium hover:opacity-90 transition"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
