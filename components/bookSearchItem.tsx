import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React from 'react';
import { useFontsContext } from '@/providers/fontProvider';
import BookCover from '@/components/bookCover';

const BookSearchItem = ({ book, onPress }: { book: BookSearchResult; onPress: any }) => {
    const [font, setFont] = useFontsContext();

    return (
        <>
            <TouchableOpacity
                key={book.ref}
                onPress={onPress}
            >
                <View style={styles.modalBookItem}>
                    <BookCover
                        style={styles.modalImage}
                        uri={book.thumbnail}
                    />
                    <View style={{ width: '70%' }}>
                        <Text style={[styles.modalBookTitle, { fontFamily: `${font}B` }]}>{book.title}</Text>
                        <Text style={[styles.modalBookDetails, { fontFamily: `${font}R` }]}>{book.subtitle}</Text>
                        <Text style={[styles.modalBookDetails, { fontFamily: `${font}R` }]}>{book.authors?.[0] ?? ''}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </>
    );
};

export default BookSearchItem;

const styles = StyleSheet.create({
    modalBookItem: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
        borderWidth: 1,
        padding: 15,
        width: '100%',
        borderRadius: 10,
    },

    modalBookTitle: {
        fontSize: 15,
    },

    modalBookDetails: {
        fontSize: 15,
    },

    modalImage: {
        width: 80,
        height: 120,
        borderRadius: 10,
    },
});
