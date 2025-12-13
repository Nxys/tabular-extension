declare const mockChrome: {
    runtime: {
        onInstalled: {
            addListener: jest.Mock<any, any, any>;
        };
        onStartup: {
            addListener: jest.Mock<any, any, any>;
        };
        onMessage: {
            addListener: jest.Mock<any, any, any>;
        };
        sendMessage: jest.Mock<any, any, any>;
    };
    action: {
        onClicked: {
            addListener: jest.Mock<any, any, any>;
        };
        setTitle: jest.Mock<any, any, any>;
    };
    tabs: {
        onUpdated: {
            addListener: jest.Mock<any, any, any>;
        };
        sendMessage: jest.Mock<any, any, any>;
    };
};
//# sourceMappingURL=setup.d.ts.map