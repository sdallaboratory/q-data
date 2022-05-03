import _ from 'lodash';
import { environment } from '../../../../shared/environment';
import { VkCollectGroupsParams } from '../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-params';

export const vkCollectGroupsDefaultParams: VkCollectGroupsParams = {
    mongo: {
        collection: 'groups',
        db: environment.MONGO_DB,
    },
    queries: [
        'МГТУ им. Н.Э. Баумана',
        'МГТУ Баумана',
        'Бауманка',

        ...['Мытищинский филиал', 'Калужский филиал', 'Дмитров', 'Королёв',
            'АК', 'БМТ', 'ИБМ', 'ИУ', 'К', 'Л', 'ЛТ', 'МТ', 'ОЭ', 'РК', 'РКТ',
            'РЛ', 'РТ', 'СГН', 'СМ', 'ФН', 'Э', 'ЮР',
            'Энергомашиностроение',
            'Машиностроительные технологии',
            'Специальное Машиностроение',
            'Радиолокационная техника',
            'Энергомашиностроение',
        ].map(query => `МГТУ Баумана ${query}`),

        ...[
            'лицей', 'школа', 'вуз', 'университет', 'вариант', 'помощь', 'ДЗ', 'Реферат',
            'Диплом', 'факультет', 'профсоюз', 'студсовет', 'кафедра', 'курс', 'выпуск',
        ].map(query => `${query} МГТУ Баумана`),

        'абитуриенты МГТУ',
        'выпускники МГТУ',
        'Московский Государственный Технический Университет им. Н. Э. Баумана',
        'МГТУ',
        'Бауманец',
        'Baumanka',
        'Bauman',
        'Bauman Memes',
        'bmstu',
        ..._.range(2010, 2030).map(year => `МГТУ ${year}`),
    ],
    stopWords: {
        caseSensitive: [
            'Майкоп', 'Мурманск', 'Калуга', 'Калужский', 'Магнитогорск', 'Носов',
            'Косыгин', 'МИРЭА', 'СТАНКИН', 'МГТУ ГА', 'МАИ', 'МАМИ', 'МГУДТ', 'Яблонов',
            'Туркменлер', 'АРиЖ', 'mstu', 'mkgtu', 'magtu', 'kosygin',
            'rgu', 'rgu', 'Alex', 'Elise', 'Apple', 'ФЗСЭО ',
        ],
        caseInsensitive: ['ГА', 'ЖК'],
    },
};