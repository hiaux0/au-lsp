import * as DIAGNOSTIC_MESSAGES from './diagnosticMessages.json';

export class DiagnosticMessages {
  private readonly aureliaCode = 'auvsc';

  private readonly diagnosticCodeForMessage = '';

  constructor(private readonly message: keyof typeof DIAGNOSTIC_MESSAGES) {
    this.message = message;
    this.diagnosticCodeForMessage = `${this.aureliaCode}(${DIAGNOSTIC_MESSAGES[message].code})`;
  }

  public log(): void {
    const targetMessage = DIAGNOSTIC_MESSAGES[this.message];
    const consoleMessage =
      `[${targetMessage.category}] ${
      this.message
      } ${this.diagnosticCodeForMessage}`;

    console.log(consoleMessage);
  }

  public additionalLog(message: string, data: any): void {
    console.log(`${message}: ${data} ${this.diagnosticCodeForMessage}`);
  }
}
