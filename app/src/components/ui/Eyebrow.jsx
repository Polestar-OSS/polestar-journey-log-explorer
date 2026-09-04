import { Text } from '@mantine/core';

/** Small uppercase tracked label - the Polestar "eyebrow". */
function Eyebrow({ children, className = '', ...props }) {
    return (
        <Text component="span" className={`ps-eyebrow ${className}`} {...props}>
            {children}
        </Text>
    );
}

export default Eyebrow;
