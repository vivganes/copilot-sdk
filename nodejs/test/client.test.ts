/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, onTestFinished } from "vitest";
import { CopilotClient } from "../src/index.js";
import { CLI_PATH } from "./e2e/harness/sdkTestContext.js";

// This file is for unit tests. Where relevant, prefer to add e2e tests in e2e/*.test.ts instead

describe("CopilotClient", () => {
    it("returns a standardized failure result when a tool is not registered", async () => {
        const client = new CopilotClient({ cliPath: CLI_PATH });
        await client.start();
        onTestFinished(() => client.forceStop());

        const session = await client.createSession();

        const response = await (
            client as unknown as { handleToolCallRequest: (typeof client)["handleToolCallRequest"] }
        ).handleToolCallRequest({
            sessionId: session.sessionId,
            toolCallId: "123",
            toolName: "missing_tool",
            arguments: {},
        });

        expect(response.result).toMatchObject({
            resultType: "failure",
            error: "tool 'missing_tool' not supported",
        });
    });

    describe("isModelEnabled", () => {
        it("should return true for enabled models", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a model with enabled state
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "test-model",
                    name: "Test Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "enabled", terms: "" },
                },
            ];

            const isEnabled = await client.isModelEnabled("test-model");
            expect(isEnabled).toBe(true);

            // Restore original
            client.listModels = originalListModels;
        });

        it("should return false for disabled models", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a model with disabled state
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "test-model",
                    name: "Test Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "disabled", terms: "" },
                },
            ];

            const isEnabled = await client.isModelEnabled("test-model");
            expect(isEnabled).toBe(false);

            // Restore original
            client.listModels = originalListModels;
        });

        it("should return false for unconfigured models", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a model with unconfigured state
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "test-model",
                    name: "Test Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "unconfigured", terms: "" },
                },
            ];

            const isEnabled = await client.isModelEnabled("test-model");
            expect(isEnabled).toBe(false);

            // Restore original
            client.listModels = originalListModels;
        });

        it("should return false for non-existent models", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return an empty array
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [];

            const isEnabled = await client.isModelEnabled("non-existent-model");
            expect(isEnabled).toBe(false);

            // Restore original
            client.listModels = originalListModels;
        });

        it("should return false for models with no policy field", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a model without a policy field
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "no-policy-model",
                    name: "No Policy Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    // policy is undefined
                },
            ];

            const isEnabled = await client.isModelEnabled("no-policy-model");
            expect(isEnabled).toBe(false);

            // Restore original
            client.listModels = originalListModels;
        });
    });

    describe("createSession model validation", () => {
        it("should throw error for non-existent model", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return an empty array
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [];

            await expect(client.createSession({ model: "non-existent-model" })).rejects.toThrow(
                "Model 'non-existent-model' not found"
            );

            // Restore original
            client.listModels = originalListModels;
        });

        it("should throw error for disabled model", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a disabled model
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "disabled-model",
                    name: "Disabled Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "disabled", terms: "" },
                },
            ];

            await expect(client.createSession({ model: "disabled-model" })).rejects.toThrow(
                "Cannot create session: Model 'disabled-model' is not enabled (status: disabled)"
            );

            // Restore original
            client.listModels = originalListModels;
        });

        it("should throw error for unconfigured model", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return an unconfigured model
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "unconfigured-model",
                    name: "Unconfigured Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "unconfigured", terms: "" },
                },
            ];

            await expect(client.createSession({ model: "unconfigured-model" })).rejects.toThrow(
                "Cannot create session: Model 'unconfigured-model' is not enabled (status: unconfigured)"
            );

            // Restore original
            client.listModels = originalListModels;
        });

        it("should throw error for model with no policy field", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a model without a policy field
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "no-policy-model",
                    name: "No Policy Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    // policy is undefined
                },
            ];

            await expect(client.createSession({ model: "no-policy-model" })).rejects.toThrow(
                "Cannot create session: Model 'no-policy-model' is not enabled (status: unknown)"
            );

            // Restore original
            client.listModels = originalListModels;
        });

        it("should succeed for enabled model", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return an enabled model
            const originalListModels = client.listModels.bind(client);
            client.listModels = async () => [
                {
                    id: "enabled-model",
                    name: "Enabled Model",
                    capabilities: {
                        supports: { vision: false },
                        limits: { max_context_window_tokens: 4096 },
                    },
                    policy: { state: "enabled", terms: "" },
                },
            ];

            // This should not throw
            const session = await client.createSession({ model: "enabled-model" });
            expect(session).toBeDefined();
            await session.destroy();

            // Restore original
            client.listModels = originalListModels;
        });

        it("should succeed when no model is specified", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // This should not throw - model validation is skipped when no model specified
            const session = await client.createSession();
            expect(session).toBeDefined();
            await session.destroy();
        });

        it("should skip validation when skipModelValidation is true", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a disabled model
            const originalListModels = client.listModels.bind(client);
            let listModelsCalled = false;
            client.listModels = async () => {
                listModelsCalled = true;
                return [
                    {
                        id: "disabled-model",
                        name: "Disabled Model",
                        capabilities: {
                            supports: { vision: false },
                            limits: { max_context_window_tokens: 4096 },
                        },
                        policy: { state: "disabled", terms: "" },
                    },
                ];
            };

            // This should NOT throw and should NOT call listModels
            const session = await client.createSession({
                model: "disabled-model",
                skipModelValidation: true,
            });
            expect(session).toBeDefined();
            expect(listModelsCalled).toBe(false);
            await session.destroy();

            // Restore original
            client.listModels = originalListModels;
        });

        it("should still validate when skipModelValidation is false", async () => {
            const client = new CopilotClient({ cliPath: CLI_PATH });
            await client.start();
            onTestFinished(() => client.forceStop());

            // Mock listModels to return a disabled model
            const originalListModels = client.listModels.bind(client);
            let listModelsCalled = false;
            client.listModels = async () => {
                listModelsCalled = true;
                return [
                    {
                        id: "disabled-model",
                        name: "Disabled Model",
                        capabilities: {
                            supports: { vision: false },
                            limits: { max_context_window_tokens: 4096 },
                        },
                        policy: { state: "disabled", terms: "" },
                    },
                ];
            };

            // This SHOULD throw and SHOULD call listModels
            await expect(
                client.createSession({
                    model: "disabled-model",
                    skipModelValidation: false,
                })
            ).rejects.toThrow("Cannot create session: Model 'disabled-model' is not enabled");
            expect(listModelsCalled).toBe(true);

            // Restore original
            client.listModels = originalListModels;
        });
    });

    describe("URL parsing", () => {
        it("should parse port-only URL format", () => {
            const client = new CopilotClient({
                cliUrl: "8080",
                logLevel: "error",
            });

            // Verify internal state
            expect((client as any).actualPort).toBe(8080);
            expect((client as any).actualHost).toBe("localhost");
            expect((client as any).isExternalServer).toBe(true);
        });

        it("should parse host:port URL format", () => {
            const client = new CopilotClient({
                cliUrl: "127.0.0.1:9000",
                logLevel: "error",
            });

            expect((client as any).actualPort).toBe(9000);
            expect((client as any).actualHost).toBe("127.0.0.1");
            expect((client as any).isExternalServer).toBe(true);
        });

        it("should parse http://host:port URL format", () => {
            const client = new CopilotClient({
                cliUrl: "http://localhost:7000",
                logLevel: "error",
            });

            expect((client as any).actualPort).toBe(7000);
            expect((client as any).actualHost).toBe("localhost");
            expect((client as any).isExternalServer).toBe(true);
        });

        it("should parse https://host:port URL format", () => {
            const client = new CopilotClient({
                cliUrl: "https://example.com:443",
                logLevel: "error",
            });

            expect((client as any).actualPort).toBe(443);
            expect((client as any).actualHost).toBe("example.com");
            expect((client as any).isExternalServer).toBe(true);
        });

        it("should throw error for invalid URL format", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "invalid-url",
                    logLevel: "error",
                });
            }).toThrow(/Invalid cliUrl format/);
        });

        it("should throw error for invalid port - too high", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:99999",
                    logLevel: "error",
                });
            }).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error for invalid port - zero", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:0",
                    logLevel: "error",
                });
            }).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error for invalid port - negative", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:-1",
                    logLevel: "error",
                });
            }).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error when cliUrl is used with useStdio", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    useStdio: true,
                    logLevel: "error",
                });
            }).toThrow(/cliUrl is mutually exclusive/);
        });

        it("should throw error when cliUrl is used with cliPath", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    cliPath: "/path/to/cli",
                    logLevel: "error",
                });
            }).toThrow(/cliUrl is mutually exclusive/);
        });

        it("should set useStdio to false when cliUrl is provided", () => {
            const client = new CopilotClient({
                cliUrl: "8080",
                logLevel: "error",
            });

            expect(client["options"].useStdio).toBe(false);
        });

        it("should mark client as using external server", () => {
            const client = new CopilotClient({
                cliUrl: "localhost:8080",
                logLevel: "error",
            });

            expect((client as any).isExternalServer).toBe(true);
        });
    });
});
